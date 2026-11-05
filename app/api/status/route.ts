import {publicServiceStatus} from '@/app/lib/service-status';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){return Response.json(await publicServiceStatus(),{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}})}
