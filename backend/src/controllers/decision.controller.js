import { GoogleGenerativeAI } from '@google/generative-ai';
import { compareTravel, compareCommute, compareFood } from '../services/decision.service.js';

// Keyword-based local fallback parser if Gemini API fails or is not configured
function parseQuestionFallback(question) {
  const q = question.toLowerCase();

  if (q.includes('wfh') || q.includes('work from home') || q.includes('home tomorrow')) {
    // Determine transport mode if present
    let transportMode = 'Car';
    if (q.includes('metro')) transportMode = 'Metro';
    else if (q.includes('bus')) transportMode = 'Bus';
    else if (q.includes('bike') || q.includes('motorcycle')) transportMode = 'Motorcycle';
    
    // Attempt to extract distance
    const distanceMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:km|kms|kilometers)/);
    const distance = distanceMatch ? parseFloat(distanceMatch[1]) : 15; // default 15km
    
    return { category: 'wfh', distance, transportMode };
  }

  if (q.includes('cook') || q.includes('order') || q.includes('delivery')) {
    let mealCook = 'Vegetarian';
    if (q.includes('vegan')) mealCook = 'Vegan';
    let mealOrder = 'Chicken';
    if (q.includes('beef')) mealOrder = 'Beef';
    else if (q.includes('veg')) mealOrder = 'Vegetarian';

    return { category: 'food', mealCook, mealOrder, deliveryDistance: 5 };
  }

  if (q.includes('drive') || q.includes('metro') || q.includes('bus') || q.includes('take') || q.includes('travel')) {
    // Travel options compare
    let modeA = 'Car';
    let modeB = 'Metro';
    if (q.includes('bus')) modeB = 'Bus';
    else if (q.includes('auto')) modeB = 'Auto Rickshaw';
    else if (q.includes('bike') || q.includes('motorcycle')) modeB = 'Motorcycle';
    else if (q.includes('walk')) modeB = 'Walking';
    else if (q.includes('cycle') || q.includes('bicycle')) modeB = 'Bicycle';

    const distanceMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:km|kms|kilometers)/);
    const distance = distanceMatch ? parseFloat(distanceMatch[1]) : 10; // default 10km

    return { category: 'travel', distance, modeA, modeB };
  }

  return { category: 'none' };
}

export async function handleDecisionChat(req, res) {
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Bad Request', message: 'Question string is required.' });
  }

  const apiKey = process.env.NODE_ENV === 'test' ? null : process.env.GEMINI_API_KEY;
  let extraction = { category: 'none' };

  if (!apiKey) {
    extraction = parseQuestionFallback(question);
  } else {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });

      const systemPrompt = `
You are the EcoAI Decision Engine Parser.
Your job is to read the user's sustainability question and extract comparison arguments in a structured JSON block.
Determine if the question fits into one of these three categories:
1. 'travel': user comparing two transport modes for a specific distance (e.g. driving vs metro, bus vs car).
   - Extract: 'distance' (number in km), 'modeA' (e.g., 'car', 'metro', 'bus', 'auto_rickshaw', 'motorcycle', 'walking', 'bicycle'), 'modeB'.
2. 'wfh': user asking if they should work from home tomorrow, or comparing WFH vs office commute.
   - Extract: 'distance' (one-way distance to office in km, e.g. 15 km), 'transportMode' (the mode they commute by).
3. 'food': user comparing cooking at home vs ordering delivery.
   - Extract: 'mealCook' (e.g. 'vegetarian', 'chicken', 'beef', 'vegan'), 'mealOrder' (the ordered meal type), 'deliveryDistance' (distance in km, default to 5).

If the query does not ask for a comparison, return:
\`\`\`json
{ "category": "none" }
\`\`\`

If it is a valid comparison, return:
\`\`\`json
{
  "category": "travel" | "wfh" | "food",
  "distance": number,
  "modeA": string,
  "modeB": string,
  "transportMode": string,
  "mealCook": string,
  "mealOrder": string,
  "deliveryDistance": number
}
\`\`\`
Rules:
- Keep values strictly to what is mentioned. If travel distance is completely missing, default to 10 km.
`;

      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\nUser Question: "${question}"` }] }
        ]
      });

      const responseText = result.response.text().trim();
      const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        extraction = JSON.parse(jsonMatch[1]);
      } else {
        extraction = parseQuestionFallback(question);
      }
    } catch (error) {
      console.error('Gemini decision extraction failed:', error);
      extraction = parseQuestionFallback(question);
    }
  }

  // Execute comparison based on extraction category
  let comparison = null;
  if (extraction.category === 'travel') {
    comparison = compareTravel(extraction.distance || 10, extraction.modeA || 'Car', extraction.modeB || 'Metro');
  } else if (extraction.category === 'wfh') {
    comparison = compareCommute(extraction.distance || 15, extraction.transportMode || 'Car');
  } else if (extraction.category === 'food') {
    comparison = compareFood(extraction.mealCook || 'Vegetarian', extraction.mealOrder || 'Chicken', extraction.deliveryDistance || 5);
  }

  if (!comparison) {
    // Non-comparison question
    const defaultMsg = "I'm the EcoAI Decision Engine. You can ask me comparison questions such as 'Should I drive or take the metro?' or 'Should I work from home tomorrow?' to see real-time carbon impacts!";
    return res.json({
      calculated: null,
      advice: defaultMsg
    });
  }

  // Format AI explanation prompt
  let explanation = '';
  if (!apiKey) {
    explanation = `Based on calculations, choosing **${comparison.recommended}** reduces your carbon impact by **${comparison.reductionPercent}%** (Option A: ${comparison.optionA.co2Kg} kg CO2 vs Option B: ${comparison.optionB.co2Kg} kg CO2). Swapping to green travel or home cooking is a highly recommended sustainability practice!`;
  } else {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });

      const prompt = `
You are the EcoAI Sustainability Coach.
Here are the deterministic calculations for the user's decision comparison:
- Question: "${question}"
- Category: ${comparison.category}
- Option A: ${comparison.optionA.mode} (${comparison.optionA.co2Kg} kg CO2)
- Option B: ${comparison.optionB.mode} (${comparison.optionB.co2Kg} kg CO2)
- Recommended: ${comparison.recommended}
- Carbon Reduction: ${comparison.reductionPercent}%

Please write a helpful, encouraging explanation of why the recommended option is better.
Rules:
- Under no circumstances should you calculate carbon footprint numbers or run mathematical operations. Rely strictly on the provided calculations.
- Mention the specific carbon saving of ${comparison.reductionPercent}% and the calculated CO2 weights.
- Keep your advice under 120 words.
- Provide Indian context where applicable (e.g. Delhi Metro, local commute congestion, home cooking values).
`;

      const result = await model.generateContent(prompt);
      explanation = result.response.text().trim();
    } catch (e) {
      console.error('Explanation generation failed:', e);
      explanation = `Based on calculations, choosing **${comparison.recommended}** reduces your carbon impact by **${comparison.reductionPercent}%** (Option A: ${comparison.optionA.co2Kg} kg CO2 vs Option B: ${comparison.optionB.co2Kg} kg CO2). Swapping to green travel or home cooking is a highly recommended sustainability practice!`;
    }
  }

  return res.json({
    calculated: comparison,
    advice: explanation
  });
}
