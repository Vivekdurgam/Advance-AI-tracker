import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, description, employees } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const employeeList = (employees || []).map((e: any) =>
      `- ${e.name} (${e.department}, ${e.role}): skills=[${e.skillTags.join(', ')}], load=${e.currentTicketLoad}, availability=${e.availability}, avgResTime=${e.avgResolutionTime}h`
    ).join('\n');

    const systemPrompt = `You are an AI ticket analysis engine for an internal IT ticketing system. Analyze the incoming ticket and produce a structured JSON response.

Available employees:
${employeeList}

You MUST respond with ONLY valid JSON matching this exact schema:
{
  "category": "Billing" | "Bug" | "Access" | "HR" | "Server" | "DB" | "Feature" | "Other",
  "summary": "2-3 sentence summary",
  "severity": "Critical" | "High" | "Medium" | "Low",
  "resolutionPath": "Auto-resolve" | "Assign to department",
  "sentiment": "Frustrated" | "Neutral" | "Polite",
  "suggestedDepartment": "Engineering" | "DevOps" | "Finance" | "HR" | "IT" | "Product" | "Marketing" | "Legal",
  "suggestedEmployeeId": "employee id from the list above or null",
  "confidenceScore": 0-100,
  "estimatedResolutionTime": "e.g. 2 hours, 1 day",
  "autoResponse": "If resolutionPath is Auto-resolve, provide a professional, specific response addressing the user's issue. Otherwise null."
}

Routing rules:
- Database issues / data corruption → Engineering (Critical)
- Server down / performance → Engineering or DevOps (Critical)
- Payroll / salary / reimbursement → Finance
- Leave / HR policy / onboarding → HR
- Access permissions / account lock → IT (High)
- Product bug / feature request → Product or Engineering
- Marketing / content / branding → Marketing
- Legal / compliance → Legal (High)

Auto-resolve if the issue is:
- Password reset instructions
- Leave policy / HR policy questions
- General FAQs about tools/systems
- Status update requests
- Simple billing clarifications

For assignee suggestion, consider: skill match, current load (prefer lower), and availability (prefer Available over Busy, never assign to On Leave).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Subject: ${subject}\n\nDescription: ${description}` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const analysis = JSON.parse(content);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-ticket error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
