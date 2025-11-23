import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, Student } from "../types";

// Note: In a real app, API Key should be securely injected.
// This example assumes process.env.API_KEY is available.
// If running locally without env, this feature will fail gracefully.

export const generateAttendanceReport = async (
  students: Student[],
  attendance: AttendanceRecord[]
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key missing. Cannot generate AI report.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  // Prepare data summary
  const totalStudents = students.length;
  const presentCount = attendance.filter(
    (a) => new Date(a.timestamp).toDateString() === new Date().toDateString()
  ).length;
  
  const absentCount = totalStudents - presentCount;
  
  // Format recent records for context (limit to last 20 to save tokens)
  const recentLog = attendance.slice(0, 20).map(a => 
    `- ${a.studentName} (${a.status}) at ${new Date(a.timestamp).toLocaleTimeString()}`
  ).join('\n');

  const prompt = `
    You are an AI assistant for a school administrator. Analyze the following daily attendance data:
    
    Total Students: ${totalStudents}
    Present Today: ${presentCount}
    Absent Today: ${absentCount}
    
    Recent Activity Log:
    ${recentLog}

    Please provide a concise executive summary in Markdown format.
    1. Overall attendance rate percentage.
    2. A brief analysis of the attendance trend.
    3. Any anomalies or specific student patterns if visible (simulated insight).
    4. A motivational quote for the class.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate report due to an API error.";
  }
};