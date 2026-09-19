import type { Metadata } from "next";
import AdminModuleClient from "./AdminModuleClient";
import { activeOrganization, getAdminContext, moduleCopy, type AdminModuleId } from "./admin-data";
import "./admin.css";

export function metadataFor(module: AdminModuleId): Metadata { return { title: `${moduleCopy[module].title} | JobForged`, description: moduleCopy[module].description }; }
export async function AdminPage({ module }: { module: AdminModuleId }) { const context=await getAdminContext(activeOrganization.id); if(!context)return null; return <AdminModuleClient module={module} context={context}/>; }
