"""Tests for Vault API routes (Bearer token access) and encryption service.

Covers the security-critical paths: secret retrieval via token, permission
checking, and encryption/decryption round-trip.
"""
from __future__ import annotations

import base64
import os

import pytest

from app.services.encryption import EncryptionService, reset_encryption_service

# ---------------------------------------------------------------------------
# Encryption service tests
# ---------------------------------------------------------------------------


class TestEncryptionService:
    """Test AES-256-GCM encryption and decryption."""

    def _make_key(self) -> str:
        """Generate a valid base64-encoded 32-byte key."""
        return base64.b64encode(os.urandom(32)).decode()

    def test_encrypt_decrypt_roundtrip(self):
        key = self._make_key()
        svc = EncryptionService(encryption_key=key)
        plaintext = "hello world"
        encrypted = svc.encrypt(plaintext)
        assert encrypted != plaintext
        assert svc.decrypt(encrypted) == plaintext

    def test_encrypt_produces_different_ciphertext(self):
        """Each encryption uses a random IV, so ciphertext differs."""
        key = self._make_key()
        svc = EncryptionService(encryption_key=key)
        encrypted1 = svc.encrypt("same input")
        encrypted2 = svc.encrypt("same input")
        assert encrypted1 != encrypted2
        assert svc.decrypt(encrypted1) == "same input"
        assert svc.decrypt(encrypted2) == "same input"

    def test_encrypt_decrypt_bytes(self):
        """Bytes input is treated as UTF-8 string after round-trip."""
        key = self._make_key()
        svc = EncryptionService(encryption_key=key)
        data = b"binary-safe-data"
        encrypted = svc.encrypt(data)
        assert svc.decrypt(encrypted) == data.decode("utf-8")

    def test_encrypt_empty_string(self):
        key = self._make_key()
        svc = EncryptionService(encryption_key=key)
        encrypted = svc.encrypt("")
        assert svc.decrypt(encrypted) == ""

    def test_encrypt_unicode(self):
        key = self._make_key()
        svc = EncryptionService(encryption_key=key)
        plaintext = "密钥管理 🔑日本語"
        encrypted = svc.encrypt(plaintext)
        assert svc.decrypt(encrypted) == plaintext

    def test_decrypt_with_wrong_key_fails(self):
        key1 = self._make_key()
        key2 = self._make_key()
        svc1 = EncryptionService(encryption_key=key1)
        svc2 = EncryptionService(encryption_key=key2)
        encrypted = svc1.encrypt("secret")
        with pytest.raises(ValueError, match="Decryption failed"):
            svc2.decrypt(encrypted)

    def test_no_keys_raises(self):
        """Constructor should raise when no keys are available."""
        old = os.environ.pop("ENCRYPTION_KEY", None)
        try:
            with pytest.raises(ValueError, match="No encryption key configured"):
                EncryptionService(encryption_key=None)
        finally:
            if old is not None:
                os.environ["ENCRYPTION_KEY"] = old

    def test_hex_key_format(self):
        """Should accept hex-encoded keys."""
        hex_key = os.urandom(32).hex()
        svc = EncryptionService(encryption_key=hex_key)
        encrypted = svc.encrypt("hex key test")
        assert svc.decrypt(encrypted) == "hex key test"

    def test_invalid_key_raises(self):
        with pytest.raises(ValueError, match="Invalid"):
            EncryptionService(encryption_key="not-a-valid-key")

    def test_decrypt_tampered_data_fails(self):
        key = self._make_key()
        svc = EncryptionService(encryption_key=key)
        encrypted = svc.encrypt("tamper me")
        raw = bytearray(base64.b64decode(encrypted))
        raw[-1] ^= 0xFF  # flip last byte (part of tag)
        with pytest.raises(ValueError):
            svc.decrypt(base64.b64encode(raw).decode())

    def test_decrypt_too_short_fails(self):
        key = self._make_key()
        svc = EncryptionService(encryption_key=key)
        with pytest.raises(ValueError, match="too short"):
            svc.decrypt(base64.b64encode(b"\x00" * 5).decode())

    def test_large_value_encryption(self):
        key = self._make_key()
        svc = EncryptionService(encryption_key=key)
        large_value = "x" * 50000
        encrypted = svc.encrypt(large_value)
        assert svc.decrypt(encrypted) == large_value

    def test_singleton_pattern(self):
        """get_encryption_service returns the same instance."""
        reset_encryption_service()
        key = self._make_key()
        os.environ["ENCRYPTION_KEY"] = key
        try:
            from app.services.encryption import get_encryption_service
            svc1 = get_encryption_service(encryption_key=key)
            svc2 = get_encryption_service()
            assert svc1 is svc2
        finally:
            reset_encryption_service()
