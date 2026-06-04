import { NextResponse } from "next/server";
import { searchParts } from "@/lib/partsSearch";

export async function POST(req) {
  const { symptom, car } = await req.json();

  if (!symptom) {
    return NextResponse.json({ error: "empty symptom" }, { status: 400 });
  }

  const results = searchParts(symptom, car);

  if (!results.length) {
    return NextResponse.json({
      type: "not_found",
      message: "Уточните симптом",
      car_context: car || null,
    });
  }

  return NextResponse.json({
    type: "found",
    car_context: car || null,
    results: results.map((r) => ({
      part: r.part,
      article: r.article,
      system: r.system,
    })),
  });
}
