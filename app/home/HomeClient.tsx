"use client";
import {AdminShell} from '@/app/components/admin/AdminModuleClient';
import {OperationalModule} from '@/app/components/operations/OperationalModule';
import {PlatformHomeBanners} from '@/app/components/admin/PlatformHomeBanners';
import {AccountSetup} from './AccountSetup';
import type {HomeContext} from './service';
import '@/app/components/admin/admin.css';
export default function HomeClient({initialContext}:{initialContext:HomeContext}){return <AdminShell module="home" context={{organization:initialContext.organization,user:{name:initialContext.user.name,role:initialContext.user.role,initials:initialContext.user.avatarInitials}}}><OperationalModule module="home" overviewContent={<PlatformHomeBanners/>}/><AccountSetup/></AdminShell>}
