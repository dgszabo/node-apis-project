import { NextRequest, NextResponse } from "next/server";
import { InteractionsService } from "@/services/interactions.service";
import { getUserIdFromHeader } from "@/utils/auth";
import { z } from "zod";

const interactionsService = new InteractionsService();

// Validation schema for updating an interaction (UserExercise)
const updateInteractionsSchema = z.object({
  isSaved: z.boolean().optional(),
  isFavorited: z.boolean().optional(),
  rating: z.union([
    z.number().int().min(1).max(5),
    z.null()
  ]).optional()
}).refine(
  (data) => data.isSaved !== undefined || data.isFavorited !== undefined || data.rating !== undefined,
  { message: "At least one field (isSaved, isFavorited, or rating) must be provided" }
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserIdFromHeader(request);
    const updates = updateInteractionsSchema.parse(await request.json());
    const exerciseId = params.id;

    const result = await interactionsService.updateInteraction(userId, exerciseId, updates);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in exercise interaction:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message === "Exercise not found") {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message === "Cannot interact with your own exercise") {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
