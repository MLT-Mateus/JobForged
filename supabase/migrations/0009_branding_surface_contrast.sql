-- Complete contrast checks on every branded reading surface; 0008 stays immutable.
create function app_private.protect_branding_surface_contrast()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare config jsonb;palette jsonb;field text;foreground text;a double precision;b double precision;
begin
 for config in select new.draft union all select new.published loop
  if config='{}'::jsonb then continue;end if;
  for palette in select (config->'palette')||jsonb_build_object('background',config#>'{theme,light,background}','surface',config#>'{theme,light,surface}','text',config#>'{theme,light,text}') union all select config#>'{theme,dark}' loop
   foreach field in array array['surface','background','sidebar','activeItem','portalBackground'] loop
    b:=app_private.branding_luminance(palette->>field);
    foreach foreground in array array['text','link'] loop
     a:=app_private.branding_luminance(palette->>foreground);
     if (greatest(a,b)+0.05)/(least(a,b)+0.05)<4.5 then raise exception 'insufficient branded surface contrast' using errcode='22023';end if;
    end loop;
   end loop;
  end loop;
 end loop;
 return new;
end;$$;
revoke all on function app_private.protect_branding_surface_contrast() from public,anon,authenticated;
create trigger protect_branding_surface_contrast before insert or update on public.company_branding
for each row execute function app_private.protect_branding_surface_contrast();
