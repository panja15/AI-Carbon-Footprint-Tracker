import { GoogleGenerativeAI } from '@google/generative-ai';
import { User, Profile } from '../repositories/database.models.js';
import { calculateBaselineMonthlyFootprint } from '../services/calculation.service.js';
import { profileSchema } from '../middleware/validation.js';

// Rule-based Conversational Fallback Interviewer if Gemini is missing/fails
function handleFallbackAudit(messages) {
  // Simple state tracker based on user replies in the chat history
  const userReplies = messages.filter(m => m.sender === 'user').map(m => m.text);
  const totalReplies = userReplies.length;

  const questions = [
    { key: 'name', prompt: "Hi, I'm EcoAI. I'll help estimate your sustainability footprint through a quick conversation. First, what is your display name?" },
    { key: 'transport_type', prompt: "Great! What is your primary transport method? (Choose from: Car, Metro, Bus, Auto Rickshaw, Motorcycle, Bicycle, Walking)" },
    { key: 'daily_distance', prompt: "What is your average daily travel distance in kilometers? (e.g. 15)" },
    { key: 'weekly_commute_frequency', prompt: "How many days per week do you typically commute? (1-7)" },
    { key: 'diet_type', prompt: "Got it. What is your diet type? (Choose from: Vegan, Vegetarian, Chicken, Beef)" },
    { key: 'meals_per_day', prompt: "How many meals do you typically eat per day? (e.g. 3)" },
    { key: 'household_size', prompt: "How many people live in your household?" },
    { key: 'electricity_usage', prompt: "What is your average monthly electricity usage in kWh? (e.g. 150)" },
    { key: 'ai_usage_frequency', prompt: "How many AI requests do you make per day on average? (e.g. 10)" },
    { key: 'video_streaming_usage', prompt: "How many hours of video streaming do you watch per day? (e.g. 2)" }
  ];

  if (totalReplies < questions.length) {
    // Ask the next question
    return {
      complete: false,
      message: questions[totalReplies].prompt
    };
  }

  // All replies are present, extract them deterministically
  const name = userReplies[0] || 'Eco Advocate';
  const rawTransport = (userReplies[1] || 'Walking').trim().toLowerCase();
  let transport_type = 'Walking';
  if (rawTransport.includes('car')) transport_type = 'Car';
  else if (rawTransport.includes('metro')) transport_type = 'Metro';
  else if (rawTransport.includes('bus')) transport_type = 'Bus';
  else if (rawTransport.includes('auto') || rawTransport.includes('rickshaw')) transport_type = 'Auto Rickshaw';
  else if (rawTransport.includes('motorcycle') || rawTransport.includes('scooter') || rawTransport.includes('bike')) transport_type = 'Motorcycle';
  else if (rawTransport.includes('cycle') || rawTransport.includes('bicycle')) transport_type = 'Bicycle';

  const daily_distance = parseFloat(userReplies[2]) || 0;
  const weekly_commute_frequency = parseInt(userReplies[3]) || 5;

  const rawDiet = (userReplies[4] || 'Vegetarian').trim().toLowerCase();
  let diet_type = 'Vegetarian';
  if (rawDiet.includes('vegan')) diet_type = 'Vegan';
  else if (rawDiet.includes('chicken') || rawDiet.includes('poultry')) diet_type = 'Chicken';
  else if (rawDiet.includes('beef') || rawDiet.includes('meat')) diet_type = 'Beef';

  const meals_per_day = parseInt(userReplies[5]) || 3;
  const household_size = parseInt(userReplies[6]) || 1;
  const electricity_usage = parseFloat(userReplies[7]) || 100;
  const ai_usage_frequency = parseInt(userReplies[8]) || 0;
  const video_streaming_usage = parseFloat(userReplies[9]) || 0;

  return {
    complete: true,
    data: {
      name,
      transport_type,
      daily_distance,
      weekly_commute_frequency,
      diet_type,
      meals_per_day,
      household_size,
      electricity_usage,
      ai_usage_frequency,
      video_streaming_usage
    }
  };
}

export async function handleAuditChat(req, res) {
  const { messages, user_id } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'Chat messages history is required.' });
  }

  // Locate active session user
  const activeUserId = req.user.id;

  const apiKey = process.env.NODE_ENV === 'test' ? null : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Run rule-based fallback
    const result = handleFallbackAudit(messages);
    if (!result.complete) {
      return res.json({ complete: false, message: result.message });
    }
    return await saveProfileAndRespond(res, activeUserId, result.data);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });

    const systemPrompt = `
You are EcoAI, a conversational onboarding assistant.
Your goal is to estimate the user's sustainability footprint through a friendly step-by-step interview.
You must gather the following 9 pieces of information:
1. Transportation:
   - Primary transport method (choose from: Car, Metro, Bus, Auto Rickshaw, Motorcycle, Bicycle, Walking)
   - Daily travel distance (in kilometers)
   - Weekly commute frequency (days per week, 1-7)
2. Food:
   - Diet type (choose from: Vegan, Vegetarian, Chicken, Beef)
   - Meals per day (typical count)
3. Electricity:
   - Household size (number of members)
   - Monthly electricity usage (in kWh)
4. Digital Habits:
   - AI usage frequency (requests per day)
   - Video streaming usage (hours per day)

Rules:
- Behave as an interviewer ONLY. Ask questions one at a time. Be polite and encouraging.
- NEVER calculate emissions yourself.
- When you have gathered all 9 inputs (even if approximate), you MUST output a final response containing a structured JSON block enclosed in triple backticks with the 'json' tag.
- The JSON block must match this format exactly:
\`\`\`json
{
  "complete": true,
  "data": {
    "name": "User Name", // or default to "Eco Advocate"
    "transport_type": "Car" | "Metro" | "Bus" | "Auto Rickshaw" | "Motorcycle" | "Bicycle" | "Walking",
    "daily_distance": number,
    "weekly_commute_frequency": number,
    "diet_type": "Vegan" | "Vegetarian" | "Chicken" | "Beef",
    "meals_per_day": number,
    "household_size": number,
    "electricity_usage": number,
    "ai_usage_frequency": number,
    "video_streaming_usage": number
  }
}
\`\`\`
- Do not output the JSON block until all values have been collected.
`;

    // Map message history to Gemini format
    const chatContent = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will act as the interviewer and ask for inputs one at a time without calculating anything. I will output the final JSON data block when complete.' }] }
    ];

    messages.forEach(m => {
      chatContent.push({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      });
    });

    const result = await model.generateContent({ contents: chatContent });
    const responseText = result.response.text().trim();

    // Check if response contains the complete JSON block
    const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.complete && parsed.data) {
          return await saveProfileAndRespond(res, activeUserId, parsed.data);
        }
      } catch (e) {
        console.error('Failed to parse completed JSON:', e);
      }
    }

    return res.json({ complete: false, message: responseText });
  } catch (error) {
    console.error('Conversational audit error:', error);
    // If Gemini fails, default back to rule-based fallback
    const result = handleFallbackAudit(messages);
    if (!result.complete) {
      return res.json({ complete: false, message: result.message });
    }
    return await saveProfileAndRespond(res, activeUserId, result.data);
  }
}

// Handler for Traditional Onboarding Form submit
export async function handleAuditForm(req, res) {
  const { user_id, ...profileData } = req.body;

  const activeUserId = req.user.id;

  try {
    // Validate inputs
    const validated = profileSchema.parse({
      name: profileData.name,
      transport_type: profileData.transport_type,
      daily_distance: parseFloat(profileData.daily_distance),
      weekly_commute_frequency: parseInt(profileData.weekly_commute_frequency),
      diet_type: profileData.diet_type,
      meals_per_day: parseInt(profileData.meals_per_day),
      household_size: parseInt(profileData.household_size),
      electricity_usage: parseFloat(profileData.electricity_usage),
      ai_usage_frequency: parseInt(profileData.ai_usage_frequency || 0),
      video_streaming_usage: parseFloat(profileData.video_streaming_usage || 0)
    });

    return await saveProfileAndRespond(res, activeUserId, validated);
  } catch (error) {
    console.error('Traditional form audit submit error:', error);
    return res.status(400).json({ error: 'Validation Error', message: error.message || error.errors });
  }
}

// Helpers
async function saveProfileAndRespond(res, userId, data) {
  try {
    const user = await User.findByPk(userId);
    if (user && data.name) {
      user.name = data.name;
      await user.save();
    }

    // Save or update Profile
    let [profile, created] = await Profile.findOrCreate({
      where: { user_id: userId },
      defaults: {
        transport_type: data.transport_type,
        daily_distance: data.daily_distance,
        weekly_commute_frequency: data.weekly_commute_frequency,
        diet_type: data.diet_type,
        meals_per_day: data.meals_per_day,
        household_size: data.household_size,
        electricity_usage: data.electricity_usage,
        ai_usage_frequency: data.ai_usage_frequency,
        video_streaming_usage: data.video_streaming_usage
      }
    });

    if (!created) {
      profile.transport_type = data.transport_type;
      profile.daily_distance = data.daily_distance;
      profile.weekly_commute_frequency = data.weekly_commute_frequency;
      profile.diet_type = data.diet_type;
      profile.meals_per_day = data.meals_per_day;
      profile.household_size = data.household_size;
      profile.electricity_usage = data.electricity_usage;
      profile.ai_usage_frequency = data.ai_usage_frequency;
      profile.video_streaming_usage = data.video_streaming_usage;
      await profile.save();
    }

    // Calculate baseline
    const baseline = calculateBaselineMonthlyFootprint(profile);

    return res.status(200).json({
      complete: true,
      profile,
      baseline
    });
  } catch (e) {
    console.error('Save profile transaction failed:', e);
    return res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}
