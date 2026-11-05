import {brandContent,brandingDefaults} from '../app/components/personalization/branding-model.ts';
const configuration=brandContent(brandingDefaults('38000000-0000-0000-0000-000000000011','Fixture Branding'));
process.stdout.write(`do $fixture$ begin perform set_config('jbfd.fixture_config',$branding$${JSON.stringify(configuration)}$branding$,true);end $fixture$;\n`);

import {applyBrandColors,colorPresets} from '../app/components/personalization/brand-colors.ts';
const palettes=colorPresets.map(p=>brandContent(applyBrandColors(brandingDefaults('38000000-0000-0000-0000-000000000011','Fixture Branding'),p.colors)));
process.stdout.write(`do $fixture$ begin perform set_config('jbfd.palette_configs',$palettes$${JSON.stringify(palettes)}$palettes$,true);end $fixture$;\n`);
