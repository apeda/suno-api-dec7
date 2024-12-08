import { NextResponse, NextRequest } from "next/server";
import { DEFAULT_MODEL } from "@/lib/SunoApi";
import { aceDataSunoApi } from "@/lib/AceDataSunoApi";
import { corsHeaders } from "@/lib/utils";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { prompt, tags, title, make_instrumental, model } = body;
      const audioInfo = await aceDataSunoApi.custom_generate(
        prompt, tags, title,
        Boolean(make_instrumental),
        model || DEFAULT_MODEL
      );
      return new NextResponse(JSON.stringify(audioInfo), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error: any) {
      console.error('Error generating custom audio:', error.message);
      if (error.response.status === 402) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      return new NextResponse(JSON.stringify({ error: error.message }), {
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
