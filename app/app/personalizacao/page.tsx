import type {Metadata} from "next";
import PersonalizationClient from "@/app/components/personalization/PersonalizationClient";
import {activeOrganization,getAdminContext} from "@/app/components/admin/admin-data";
export const metadata:Metadata={title:"Personalização | JobForged",description:"Identidade white label da organização ativa."};
export default async function Page(){const context=await getAdminContext(activeOrganization.id);return context?<PersonalizationClient context={context}/>:null}
