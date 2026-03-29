from __future__ import annotations

import base64
import hashlib
import hmac
import os


SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )
    return "scrypt$%s$%s" % (
        base64.urlsafe_b64encode(salt).decode(),
        base64.urlsafe_b64encode(digest).decode(),
    )


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        algorithm, encoded_salt, encoded_digest = hashed_password.split("$", 2)
    except ValueError:
        return False

    if algorithm != "scrypt":
        return False

    salt = base64.urlsafe_b64decode(encoded_salt.encode())
    expected = base64.urlsafe_b64decode(encoded_digest.encode())
    actual = hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=len(expected),
    )
    return hmac.compare_digest(actual, expected)
