"use client";
import {createContext} from 'react';
/** Allows a nested editor to protect its enclosing drawer/modal as well as navigation. */
export const DraftBoundary=createContext<((id:string,dirty:boolean)=>()=>void)|null>(null);
