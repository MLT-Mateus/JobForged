#!/usr/bin/env python3
"""Provision the single Test platform account on the Test VPS as root.

Reads the Test service key from the root-owned Supabase dotenv file and never
prints or stores it. Existing accounts are granted the pinned server role
without sending duplicate invitations.
"""

import json
import os
import re
import shlex
import subprocess
import sys
import urllib.error
import urllib.request

EMAIL = "jobforged@gmail.com"
ENV_PATH = "/opt/jbfd/supabase/.env"


def psql(sql):
    result = subprocess.run(
        ["docker", "exec", "supabase-db", "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
        check=True, capture_output=True, text=True,
    )
    return result.stdout.strip()


def main():
    if os.geteuid() != 0 or not os.path.isfile(ENV_PATH):
        sys.exit("Execute como root na VPS Test com o Supabase Test configurado.")
    if os.stat(ENV_PATH).st_mode & 0o077:
        sys.exit("Permissões do .env Test estão amplas demais.")

    existing = psql(f"select id from auth.users where lower(email) = '{EMAIL}' limit 1")
    if not existing:
        with open(ENV_PATH, encoding="utf-8") as config:
            lines = (line.strip() for line in config)
            entry = next((line for line in lines if line.startswith("SERVICE_ROLE_KEY=")), None)
        if not entry:
            sys.exit("SERVICE_ROLE_KEY não encontrada no Supabase Test.")
        service_key = shlex.split(entry.split("=", 1)[1])[0]
        request = urllib.request.Request(
            "https://test.jobforged.com/auth/v1/invite",
            data=json.dumps({"email": EMAIL}).encode(), method="POST",
            headers={"apikey": service_key, "Authorization": f"Bearer {service_key}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                invited = json.load(response)
        except (urllib.error.URLError, ValueError):
            sys.exit("O Auth Test não confirmou o envio do convite. Consulte o serviço sem expor a chave.")
        existing = invited.get("id", "")
        print("Convite de acesso enviado pelo Auth Test.")
    else:
        print("Conta já existente; convite duplicado não enviado.")

    if not re.fullmatch(r"[0-9a-fA-F-]{36}", existing):
        sys.exit("O Auth Test não retornou um ID de usuário válido.")
    psql(f"insert into public.platform_admins(user_id,email,role) values ('{existing}','{EMAIL}','platform_admin') "
         "on conflict (user_id) do update set email=excluded.email, role=excluded.role")
    print("Papel administrativo Test vinculado ao ID de usuário e e-mail verificado.")


if __name__ == "__main__":
    main()
