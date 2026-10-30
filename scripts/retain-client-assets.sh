#!/usr/bin/env bash
set -euo pipefail
environment="$1"; current_image="$2"; target_image="$3"; root="$4"
[[ "$environment" == test || "$environment" == live ]]
volume="jbfd-${environment}-client-assets"
docker volume create "$volume" >/dev/null
images=()
# Bootstrap Test with locally available approved ancestors, oldest first. Never pull historical images.
if [[ "$environment" == test ]];then
 while IFS= read -r ancestor;do images+=("ghcr.io/mlt-mateus/jobforged:$ancestor");done < <(git -C "$root" rev-list --max-count=4 --first-parent HEAD | tac)
fi
images+=("$current_image" "$target_image")
for candidate in "${images[@]}";do
 [[ "$candidate" =~ ^ghcr.io/mlt-mateus/jobforged:[a-f0-9]{40}$ ]] || { echo 'Invalid application image for asset retention';exit 1; }
 if ! docker image inspect "$candidate" >/dev/null 2>&1;then continue;fi
 revision="${candidate##*:}"
 actual="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$candidate")"
 [[ "$actual" == "$revision" ]] || { echo 'Asset image revision mismatch';exit 1; }
 # Only the public client build is copied. The helper receives no .env or auth credentials.
 {
  cat "$root/shared/retained-assets.mjs"
  printf '\nconsole.log(JSON.stringify(await retainAssets("/srv/jbfd/dist/client/assets","/retained-assets",process.env.ASSET_REVISION,4)));\n'
 } | docker run --rm -i --network none --read-only --user 0 --cap-drop ALL --security-opt no-new-privileges:true \
  --mount "type=volume,src=$volume,dst=/retained-assets" -e "ASSET_REVISION=$revision" --entrypoint node "$candidate" --input-type=module
 done
