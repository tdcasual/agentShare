"""VaultGate encryption service.

This module provides AES-256-GCM encryption for secret values.
"""
from __future__ import annotations

import os
import base64
import struct

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class EncryptionService:
    """AES-256-GCM encryption service for VaultGate.

    Encrypts secret values using:
    - AES-256-GCM algorithm
    - Random 12-byte IV per encryption
    - 16-byte authentication tag
    - Key version support for rotation

    Storage format: base64(key_version + iv + ciphertext + tag)
    - key_version: 1 byte
    - iv: 12 bytes
    - ciphertext: variable length
    - tag: 16 bytes
    """

    # Key version header size
    KEY_VERSION_SIZE = 1
    IV_SIZE = 12
    TAG_SIZE = 16

    def __init__(self, encryption_key: str | None = None) -> None:
        """Initialize encryption service with configured keys.

        Args:
            encryption_key: Base64-encoded 32-byte key (from Settings.encryption_key).
                            If None, falls back to ENCRYPTION_KEY / ENCRYPTION_KEY_V1 env var.
        """
        self._keys = self._load_keys(encryption_key)
        if not self._keys:
            raise ValueError("No encryption keys configured. Set ENCRYPTION_KEY environment variable.")

    def _load_keys(self, primary_key: str | None = None) -> dict[int, bytes]:
        """Load encryption keys from Settings or environment.

        Priority:
        1. Versioned env vars (ENCRYPTION_KEY_V2, V3, ...) for key rotation
        2. Primary key from Settings (base64-encoded) or ENCRYPTION_KEY env var as V1

        Args:
            primary_key: Key from Settings.encryption_key (base64-encoded 32 bytes).

        Returns:
            Dict mapping version number to 32-byte key material.
        """
        keys = {}

        # Load versioned keys from env (V2 and above for rotation)
        for v in range(2, 256):
            env_var = f"ENCRYPTION_KEY_V{v}"
            key_str = os.environ.get(env_var)
            if key_str:
                keys[v] = self._decode_key(key_str, env_var)

        # Load V1: prefer explicit primary_key (from Settings), then ENCRYPTION_KEY env var
        v1_key = primary_key or os.environ.get("ENCRYPTION_KEY")
        if v1_key:
            keys[1] = self._decode_key(v1_key, "ENCRYPTION_KEY")

        return keys

    @staticmethod
    def _decode_key(key_str: str, source: str) -> bytes:
        """Decode a key string to 32 bytes. Accepts base64 or hex encoding.

        Args:
            key_str: The key string to decode.
            source: Description of the source (for error messages).

        Returns:
            32-byte key material.

        Raises:
            ValueError: If the key cannot be decoded or is not 32 bytes.
        """
        # Try base64 first (standard format for Settings.encryption_key)
        try:
            key_bytes = base64.b64decode(key_str)
            if len(key_bytes) == 32:
                return key_bytes
        except Exception:
            pass

        # Try hex encoding
        try:
            key_bytes = bytes.fromhex(key_str)
            if len(key_bytes) == 32:
                return key_bytes
            raise ValueError(f"Key must be 32 bytes (256 bits), got {len(key_bytes)}")
        except ValueError as e:
            raise ValueError(f"Invalid {source}: expected base64 or hex encoded 32-byte key — {e}") from e

    def get_current_key_version(self) -> int:
        """Get the current (highest) key version."""
        return max(self._keys.keys()) if self._keys else 0

    def encrypt(self, plaintext: str | bytes) -> str:
        """Encrypt plaintext using the current encryption key.

        Args:
            plaintext: The data to encrypt (string or bytes).

        Returns:
            Base64-encoded string containing: key_version + iv + ciphertext + tag

        Raises:
            ValueError: If no encryption keys are configured.
        """
        if not self._keys:
            raise ValueError("No encryption keys configured")

        # Convert to bytes if string
        if isinstance(plaintext, str):
            plaintext_bytes = plaintext.encode("utf-8")
        else:
            plaintext_bytes = plaintext

        # Get current key
        key_version = self.get_current_key_version()
        key = self._keys[key_version]

        # Generate random IV
        iv = os.urandom(self.IV_SIZE)

        # Encrypt with AES-256-GCM
        aesgcm = AESGCM(key)
        ciphertext_with_tag = aesgcm.encrypt(iv, plaintext_bytes, None)

        # Split ciphertext and tag (tag is last 16 bytes)
        ciphertext = ciphertext_with_tag[:-self.TAG_SIZE]
        tag = ciphertext_with_tag[-self.TAG_SIZE:]

        # Pack: key_version (1 byte) + iv (12 bytes) + ciphertext + tag (16 bytes)
        key_version_byte = struct.pack("B", key_version)
        packed = key_version_byte + iv + ciphertext + tag

        # Return base64 encoded
        return base64.b64encode(packed).decode("ascii")

    def decrypt(self, encrypted_b64: str) -> str:
        """Decrypt base64-encoded encrypted data.

        Args:
            encrypted_b64: Base64-encoded string from encrypt().

        Returns:
            Decrypted plaintext string.

        Raises:
            ValueError: If encrypted data is invalid or key not found.
        """
        try:
            # Decode base64
            packed = base64.b64decode(encrypted_b64)

            # Unpack: key_version (1 byte) + iv (12 bytes) + ciphertext + tag (16 bytes)
            if len(packed) < self.KEY_VERSION_SIZE + self.IV_SIZE + self.TAG_SIZE:
                raise ValueError("Encrypted data too short")

            key_version = struct.unpack("B", packed[:self.KEY_VERSION_SIZE])[0]
            iv = packed[self.KEY_VERSION_SIZE:self.KEY_VERSION_SIZE + self.IV_SIZE]
            tag = packed[-self.TAG_SIZE:]
            ciphertext = packed[self.KEY_VERSION_SIZE + self.IV_SIZE:-self.TAG_SIZE]

            # Get key for version
            if key_version not in self._keys:
                raise ValueError(f"Key version {key_version} not available")

            key = self._keys[key_version]

            # Reconstruct ciphertext_with_tag for decryption
            ciphertext_with_tag = ciphertext + tag

            # Decrypt
            aesgcm = AESGCM(key)
            plaintext_bytes = aesgcm.decrypt(iv, ciphertext_with_tag, None)

            return plaintext_bytes.decode("utf-8")

        except ValueError:
            raise
        except Exception as e:
            raise ValueError("Decryption failed") from e


# Global singleton instance
_encryption_service: EncryptionService | None = None


def get_encryption_service(encryption_key: str | None = None) -> EncryptionService:
    """Get the global encryption service singleton.

    Args:
        encryption_key: Optional key from Settings to use on first initialization.
    """
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService(encryption_key=encryption_key)
    return _encryption_service


def reset_encryption_service() -> None:
    """Reset the singleton (for testing)."""
    global _encryption_service
    _encryption_service = None
