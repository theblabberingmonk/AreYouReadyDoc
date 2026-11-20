import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import PreparationWorkspace from "@/components/PreparationWorkspace";
import { getLessonsIndex } from "@/lib/content";
export const metadata:Metadata={title:"My preparation",robots:{index:false}};
export default async function PreparationPage(){
  await auth.protect();
  return <main className="shell prep-page"><PreparationWorkspace modules={getLessonsIndex().map(({slug,title})=>({slug,title}))}/></main>;
}
