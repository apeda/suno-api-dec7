import { NextResponse, NextRequest } from "next/server";
import { DEFAULT_MODEL } from "@/lib/SunoApi";
import { corsHeaders } from "@/lib/utils";
import { aceDataSunoApi } from "@/lib/AceDataSunoApi";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { prompt, make_instrumental, model } = body;

      const audioInfo = await aceDataSunoApi.generate_task(
        prompt,
        Boolean(make_instrumental),
        model || DEFAULT_MODEL,
      );

      return new NextResponse(JSON.stringify(audioInfo), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error: any) {
      return new NextResponse(JSON.stringify({ error: 'Internal server error: ' + error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  } else {
    return new NextResponse('Method Not Allowed', {
      headers: {
        Allow: 'POST',
        ...corsHeaders
      },
      status: 405
    });
  }
}


export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}