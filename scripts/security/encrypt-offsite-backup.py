#!/usr/bin/env python3
"""Authenticated, chunked, recipient-encrypted recovery archive envelope.

The VPS holds only the recipient's public key. The matching private key stays
on the operator workstation and is protected by Windows DPAPI CurrentUser.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import struct
import sys
import tempfile

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAGIC = b"JFBENC01"
CHUNK_SIZE = 1024 * 1024


def _aad(index: int, total: int, length: int) -> bytes:
    return f"{MAGIC.decode('ascii')}/{index}/{total}/{length}".encode("ascii")


def _new_output(path: Path):
    path = Path(path)
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    return os.fdopen(fd, "wb")


def encrypt(source: Path, destination: Path, public_key_path: Path) -> dict:
    source, destination, public_key_path = map(Path, (source, destination, public_key_path))
    public_key = serialization.load_pem_public_key(public_key_path.read_bytes())
    if not isinstance(public_key, rsa.RSAPublicKey) or public_key.key_size < 3072:
        raise ValueError("A 3072-bit or stronger RSA public key is required")

    key = bytearray(secrets.token_bytes(32))
    wrapped = public_key.encrypt(
        bytes(key),
        padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
    )
    header = MAGIC + struct.pack("<I", len(wrapped)) + wrapped
    aead = AESGCM(bytes(key))
    digest = hashlib.sha256()
    total = 0
    output = None
    created = False
    try:
        output = _new_output(destination)
        created = True
        with source.open("rb") as incoming:
            output.write(header)
            index = 0
            while True:
                block = incoming.read(CHUNK_SIZE)
                if not block:
                    break
                nonce = secrets.token_bytes(12)
                encrypted = aead.encrypt(nonce, block, _aad(index, total, len(block)))
                output.write(struct.pack("<I", len(block)))
                output.write(nonce)
                output.write(encrypted[-16:])
                output.write(encrypted[:-16])
                digest.update(block)
                total += len(block)
                index += 1
            nonce = secrets.token_bytes(12)
            final_tag = aead.encrypt(nonce, b"", _aad(index, total, 0))
            output.write(struct.pack("<I", 0))
            output.write(nonce)
            output.write(final_tag)
            output.flush()
            os.fsync(output.fileno())
        with destination.open("rb") as encrypted_stream:
            file_digest = hashlib.file_digest(encrypted_stream, "sha256").hexdigest()
        os.chmod(destination, 0o600)
        return {
            "archive_sha256": digest.hexdigest(),
            "encrypted_sha256": file_digest,
            "bytes": total,
            "encrypted_bytes": destination.stat().st_size,
            "format": MAGIC.decode("ascii"),
        }
    except Exception:
        if created and destination.exists():
            destination.unlink()
        raise
    finally:
        if output is not None:
            output.close()
        for index in range(len(key)):
            key[index] = 0


def decrypt(source: Path, destination: Path, private_key_path: Path) -> dict:
    source, destination, private_key_path = map(Path, (source, destination, private_key_path))
    private_key = serialization.load_pem_private_key(private_key_path.read_bytes(), password=None)
    if not isinstance(private_key, rsa.RSAPrivateKey) or private_key.key_size < 3072:
        raise ValueError("A 3072-bit or stronger RSA private key is required")
    digest = hashlib.sha256()
    total = 0
    output = None
    created = False
    try:
        with source.open("rb") as incoming:
            if incoming.read(8) != MAGIC:
                raise ValueError("Invalid backup envelope")
            length_data = incoming.read(4)
            if len(length_data) != 4:
                raise ValueError("Truncated backup envelope")
            wrapped_length = struct.unpack("<I", length_data)[0]
            if not 256 <= wrapped_length <= 16384:
                raise ValueError("Invalid wrapped key length")
            wrapped = incoming.read(wrapped_length)
            if len(wrapped) != wrapped_length:
                raise ValueError("Truncated backup header")
            key = private_key.decrypt(
                wrapped,
                padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
            )
            aead = AESGCM(key)
            if destination:
                output = _new_output(destination)
                created = True
            index = 0
            while True:
                chunk_length_data = incoming.read(4)
                if len(chunk_length_data) != 4:
                    raise ValueError("Truncated encrypted chunk")
                chunk_length = struct.unpack("<I", chunk_length_data)[0]
                if chunk_length > CHUNK_SIZE + 32:
                    raise ValueError("Invalid encrypted chunk length")
                nonce = incoming.read(12)
                tag = incoming.read(16)
                if len(nonce) != 12 or len(tag) != 16:
                    raise ValueError("Truncated encrypted chunk header")
                encrypted = incoming.read(chunk_length)
                if len(encrypted) != chunk_length:
                    raise ValueError("Truncated encrypted chunk")
                plain = aead.decrypt(nonce, encrypted + tag, _aad(index, total, chunk_length))
                if chunk_length == 0:
                    if plain or incoming.read(1):
                        raise ValueError("Invalid backup trailer")
                    break
                if output:
                    output.write(plain)
                digest.update(plain)
                total += len(plain)
                index += 1
            if output:
                output.flush()
                os.fsync(output.fileno())
        return {"verified": True, "archive_sha256": digest.hexdigest(), "bytes": total}
    except Exception:
        if created and destination and Path(destination).exists():
            Path(destination).unlink()
        raise
    finally:
        if output is not None:
            output.close()


def self_test() -> dict:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    sample = secrets.token_bytes(CHUNK_SIZE + 73)
    with tempfile.TemporaryDirectory(prefix="jbfd-offsite-self-test-") as temporary:
        folder = Path(temporary)
        private_path = folder / "private.pem"
        public_path = folder / "public.pem"
        source = folder / "source.bin"
        encrypted_path = folder / "backup.jfenc"
        restored_path = folder / "restored.bin"
        private_path.write_bytes(private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ))
        public_path.write_bytes(private_key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ))
        source.write_bytes(sample)
        encrypted = encrypt(source, encrypted_path, public_path)
        restored = decrypt(encrypted_path, restored_path, private_path)
        if restored_path.read_bytes() != sample or restored["archive_sha256"] != encrypted["archive_sha256"]:
            raise ValueError("Full encrypted-file round-trip failed")
    return {"round_trip": True, "key_bits": private_key.key_size, "cipher": "AES-256-GCM", "key_wrap": "RSA-OAEP-SHA256"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    subparsers = parser.add_subparsers(dest="command")
    enc = subparsers.add_parser("encrypt")
    enc.add_argument("source", type=Path)
    enc.add_argument("destination", type=Path)
    enc.add_argument("public_key", type=Path)
    dec = subparsers.add_parser("decrypt")
    dec.add_argument("source", type=Path)
    dec.add_argument("destination", type=Path)
    dec.add_argument("private_key", type=Path)
    args = parser.parse_args()
    if args.self_test:
        result = self_test()
    elif args.command == "encrypt":
        result = encrypt(args.source, args.destination, args.public_key)
    elif args.command == "decrypt":
        result = decrypt(args.source, args.destination, args.private_key)
    else:
        parser.error("Choose encrypt, decrypt, or --self-test")
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Backup encryption failed: {type(error).__name__}", file=sys.stderr)
        raise SystemExit(1)
