#!/usr/bin/env python3
"""Set the explicit Test Auth return URLs and restart only Test Auth."""

import os
import pathlib
import subprocess
import sys
import tempfile

STACK = pathlib.Path("/opt/jbfd/supabase")
ENV = STACK / ".env"
URLS = ",".join((
    "https://test.jobforged.com/api/auth/callback",
    "https://test.jobforged.com/confirmar-email",
    "https://test.jobforged.com/redefinir-senha",
    "https://test.jobforged.com/convite",
))


def compose(*args):
    subprocess.run(["docker", "compose", "--env-file", str(ENV), "-f", "docker-compose.yml",
        "-f", "docker-compose.override.yml", "-f", "docker-compose.jbfd-email-template.override.yml", *args],
        cwd=STACK, check=True, stdout=subprocess.DEVNULL)


def write_private(content):
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=STACK, prefix=".env.front2.", delete=False) as file:
        path = pathlib.Path(file.name)
        file.write(content)
    os.chmod(path, 0o600)
    os.replace(path, ENV)


def main():
    if os.geteuid() != 0 or not ENV.is_file() or not (STACK / "docker-compose.jbfd-email-template.override.yml").is_file():
        sys.exit("Execute como root na VPS Test com o Auth configurado.")
    original = ENV.read_text(encoding="utf-8")
    lines = [line for line in original.splitlines() if not line.startswith("ADDITIONAL_REDIRECT_URLS=")]
    lines.append(f"ADDITIONAL_REDIRECT_URLS={URLS}")
    updated = "\n".join(lines) + "\n"
    if original == updated:
        print("URLs de retorno Test já configuradas.")
        return
    write_private(updated)
    try:
        compose("config", "--quiet")
        compose("up", "-d", "--no-deps", "--wait", "--wait-timeout", "120", "auth")
    except subprocess.CalledProcessError:
        write_private(original)
        compose("up", "-d", "--no-deps", "--wait", "--wait-timeout", "120", "auth")
        sys.exit("Falha na configuração; URLs Test anteriores restauradas.")
    print("URLs de retorno Test aplicadas ao Auth Test.")


if __name__ == "__main__":
    main()
