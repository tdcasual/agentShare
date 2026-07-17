"""VaultGate encryption service.

This module provides AES-256-GCM encryption for secret values.
"""
from __future__ import annotations

import base64
import binascii
import os
import re

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class EncryptionService:
    """AES-256-GCM encryption service for VaultGate.

    Encrypts secret values using:
    - AES-256-GCM algorithm
    - Random 12-byte IV per encryption
    - 16-byte authentication tag
    - A configured active key plus optional legacy keyring

    Storage format: v2:key-id:base64(iv + ciphertext + tag)
    Legacy v1 and unversioned payloads remain readable with any configured key.
    - iv: 12 bytes
    - ciphertext: variable length
    - tag: 16 bytes
    """

    IV_SIZE = 12
    TAG_SIZE = 16

    KEY_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,32}$")

    def __init__(
        self,
        encryption_key: str | None = None,
        encryption_keyring: dict[str, str] | None = None,
        active_key_id: str = "current",
    ) -> None:
        """Initialize encryption service with configured key.

        Args:
            encryption_key: Base64-encoded 32-byte key (from Settings.encryption_key).
                            If None, falls back to ENCRYPTION_KEY env var.
        """
        if not self.KEY_ID_PATTERN.fullmatch(active_key_id):
            raise ValueError("Invalid encryption active key id")
        keys: dict[str, bytes] = {}
        key = self._load_key(encryption_key)
        if key is not None:
            keys[active_key_id] = key
        for key_id, key_value in (encryption_keyring or {}).items():
            if not self.KEY_ID_PATTERN.fullmatch(key_id):
                raise ValueError(f"Invalid encryption key id: {key_id}")
            if key_id in keys:
                raise ValueError(f"Duplicate encryption key id: {key_id}")
            keys[key_id] = self._decode_key(key_value, f"ENCRYPTION_KEYRING[{key_id}]")
        if not keys or active_key_id not in keys:
            raise ValueError("No encryption key configured. Set ENCRYPTION_KEY environment variable.")
        self._keys = keys
        self._active_key_id = active_key_id

    def _load_key(self, primary_key: str | None = None) -> bytes | None:
        """Load encryption key from Settings or environment.

        Args:
            primary_key: Key from Settings.encryption_key (base64-encoded 32 bytes).

        Returns:
            32-byte key material, or None if not configured.
        """
        key_str = primary_key or os.environ.get("ENCRYPTION_KEY")
        if key_str:
            return self._decode_key(key_str, "ENCRYPTION_KEY")
        return None

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
        except binascii.Error:
            pass

        # Try hex encoding
        try:
            key_bytes = bytes.fromhex(key_str)
            if len(key_bytes) == 32:
                return key_bytes
            raise ValueError(f"Key must be 32 bytes (256 bits), got {len(key_bytes)}")
        except ValueError as e:
            raise ValueError(f"Invalid {source}: expected base64 or hex encoded 32-byte key — {e}") from e

    def encrypt(self, plaintext: str | bytes) -> str:
        """Encrypt plaintext using the configured encryption key.

        Args:
            plaintext: The data to encrypt (string or bytes).

        Returns:
            Base64-encoded string containing: iv + ciphertext + tag

        Raises:
            ValueError: If no encryption key is configured.
        """
        # Convert to bytes if string
        plaintext_bytes = plaintext.encode("utf-8") if isinstance(plaintext, str) else plaintext

        # Generate random IV
        iv = os.urandom(self.IV_SIZE)

        # Encrypt with AES-256-GCM
        aesgcm = AESGCM(self._keys[self._active_key_id])
        ciphertext_with_tag = aesgcm.encrypt(iv, plaintext_bytes, None)

        # Split ciphertext and tag (tag is last 16 bytes)
        ciphertext = ciphertext_with_tag[:-self.TAG_SIZE]
        tag = ciphertext_with_tag[-self.TAG_SIZE:]

        # Pack: iv (12 bytes) + ciphertext + tag (16 bytes)
        packed = iv + ciphertext + tag

        return f"v2:{self._active_key_id}:" + base64.b64encode(packed).decode("ascii")

    def decrypt(self, encrypted_b64: str) -> str:
        """Decrypt base64-encoded encrypted data.

        Args:
            encrypted_b64: Base64-encoded string from encrypt().

        Returns:
            Decrypted plaintext string.

        Raises:
            ValueError: If encrypted data is invalid.
        """
        try:
            key_candidates: list[bytes]
            if encrypted_b64.startswith("v2:"):
                _, key_id, encrypted_b64 = encrypted_b64.split(":", 2)
                key = self._keys.get(key_id)
                if key is None:
                    raise ValueError(f"Unknown encryption key id: {key_id}")
                key_candidates = [key]
            else:
                if encrypted_b64.startswith("v1:"):
                    encrypted_b64 = encrypted_b64.removeprefix("v1:")
                key_candidates = list(self._keys.values())

            packed = base64.b64decode(encrypted_b64, validate=True)

            # Unpack: iv (12 bytes) + ciphertext + tag (16 bytes)
            if len(packed) < self.IV_SIZE + self.TAG_SIZE:
                raise ValueError("Encrypted data too short")

            iv = packed[:self.IV_SIZE]
            tag = packed[-self.TAG_SIZE:]
            ciphertext = packed[self.IV_SIZE:-self.TAG_SIZE]

            # Reconstruct ciphertext_with_tag for decryption
            ciphertext_with_tag = ciphertext + tag

            for key in key_candidates:
                try:
                    plaintext_bytes = AESGCM(key).decrypt(iv, ciphertext_with_tag, None)
                    return plaintext_bytes.decode("utf-8")
                except Exception:
                    continue
            raise ValueError("Decryption failed")

        except ValueError:
            raise
        except Exception as e:
            raise ValueError("Decryption failed") from e

    def needs_reencryption(self, encrypted_value: str) -> bool:
        return not encrypted_value.startswith(f"v2:{self._active_key_id}:")


# Global singleton instance
_encryption_service: EncryptionService | None = None


def get_encryption_service(
    encryption_key: str | None = None,
    encryption_keyring: dict[str, str] | None = None,
    active_key_id: str = "current",
) -> EncryptionService:
    """Get the global encryption service singleton.

    Args:
        encryption_key: Optional key from Settings to use on first initialization.
    """
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService(
            encryption_key=encryption_key,
            encryption_keyring=encryption_keyring,
            active_key_id=active_key_id,
        )
    elif encryption_key is not None:
        expected = EncryptionService(
            encryption_key=encryption_key,
            encryption_keyring=encryption_keyring,
            active_key_id=active_key_id,
        )
        if _encryption_service._keys != expected._keys or _encryption_service._active_key_id != expected._active_key_id:
            raise ValueError("Encryption service already initialized with different key material")
    return _encryption_service


def reset_encryption_service() -> None:
    """Reset the singleton (for testing)."""
    global _encryption_service
    _encryption_service = None
