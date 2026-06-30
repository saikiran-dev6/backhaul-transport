import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ licenseNumber: z.string().min(5), emergencyContact: z.string().regex(/^[6-9]\d{9}$/), bankUpiDetails: z.string().min(3) });
export async function GET(request:NextRequest){const auth=await requestUser(request);if(!auth||auth.role!=="CAPTAIN")return NextResponse.json({error:"Captain access required"},{status:403});return NextResponse.json({profile:await db.driverProfile.findUnique({where:{userId:auth.userId},include:{vehicles:true,documents:true}})});}
export async function PATCH(request:NextRequest){const auth=await requestUser(request);if(!auth||auth.role!=="CAPTAIN")return NextResponse.json({error:"Captain access required"},{status:403});const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Invalid details"},{status:400});const profile=await db.driverProfile.update({where:{userId:auth.userId},data:parsed.data});return NextResponse.json({profile});}
