import { NextResponse, NextRequest } from "next/server";
import { DEFAULT_MODEL } from "@/lib/SunoApi";
import { aceDataSunoApi } from "@/lib/AceDataSunoApi";
import { corsHeaders } from "@/lib/utils";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { prompt, tags, title, make_instrumental, model } = body;
      const task_id = await aceDataSunoApi.custom_generate_task(
        prompt, tags, title,
        Boolean(make_instrumental),
        model || DEFAULT_MODEL
      );
      return new NextResponse(JSON.stringify({ task_id }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error: any) {
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 402,
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
