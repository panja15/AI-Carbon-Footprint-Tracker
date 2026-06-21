import { User, Profile, Goal } from '../repositories/database.models.js';
import { calculateBaselineMonthlyFootprint } from '../services/calculation.service.js';

// Setup/retrieve session details for the authenticated user
export async function getOrCreateSession(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Profile, as: 'profile' },
        { model: Goal, as: 'goals', limit: 1, order: [['id', 'DESC']] }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'Authenticated user not found in database' });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        profile: user.profile,
        goal: user.goals && user.goals.length > 0 ? user.goals[0] : null
      }
    });
  } catch (error) {
    console.error('Session initialization error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// Onboarding Questionnaire: Create/update profile and return baseline footprint
export async function saveProfile(req, res) {
  const userId = req.user.id;
  const { name, transport_type, daily_distance, diet_type, household_size, electricity_usage, weekly_commute_frequency, meals_per_day, ai_usage_frequency, video_streaming_usage, sustainability_goal } = req.validatedBody;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    if (name) {
      user.name = name;
      await user.save();
    }

    // Create or update Profile
    let profile = await Profile.findOne({ where: { user_id: userId } });
    if (profile) {
      profile.transport_type = transport_type;
      profile.daily_distance = daily_distance;
      profile.diet_type = diet_type;
      profile.household_size = household_size;
      profile.electricity_usage = electricity_usage;
      if (weekly_commute_frequency !== undefined) profile.weekly_commute_frequency = weekly_commute_frequency;
      if (meals_per_day !== undefined) profile.meals_per_day = meals_per_day;
      if (ai_usage_frequency !== undefined) profile.ai_usage_frequency = ai_usage_frequency;
      if (video_streaming_usage !== undefined) profile.video_streaming_usage = video_streaming_usage;
      if (sustainability_goal !== undefined) profile.sustainability_goal = sustainability_goal;
      await profile.save();
    } else {
      profile = await Profile.create({
        user_id: userId,
        transport_type,
        daily_distance,
        diet_type,
        household_size,
        electricity_usage,
        weekly_commute_frequency: weekly_commute_frequency !== undefined ? weekly_commute_frequency : null,
        meals_per_day: meals_per_day !== undefined ? meals_per_day : null,
        ai_usage_frequency: ai_usage_frequency !== undefined ? ai_usage_frequency : null,
        video_streaming_usage: video_streaming_usage !== undefined ? video_streaming_usage : null,
        sustainability_goal: sustainability_goal !== undefined ? sustainability_goal : null
      });
    }

    // Calculate baseline
    const baseline = calculateBaselineMonthlyFootprint(profile);

    return res.json({
      message: 'Profile saved successfully',
      profile,
      baseline_estimate: baseline.total_emission,
      baseline_details: baseline
    });
  } catch (error) {
    console.error('Save profile error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// Get user profile
export async function getProfile(req, res) {
  const userId = req.user.id;
  try {
    const user = await User.findByPk(userId, { include: [{ model: Profile, as: 'profile' }] });
    if (!user || !user.profile) {
      return res.status(404).json({ error: 'Not Found', message: 'Profile not found' });
    }

    return res.json(user.profile);
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// Create or update Goal
export async function saveGoal(req, res) {
  const userId = req.user.id;
  const { monthly_target } = req.validatedBody;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found. Please initialize session first.' });
    }

    let goal = await Goal.findOne({ where: { user_id: userId } });
    if (goal) {
      goal.monthly_target = monthly_target;
      await goal.save();
    } else {
      goal = await Goal.create({
        user_id: userId,
        monthly_target
      });
    }

    return res.json({
      message: 'Goal saved successfully',
      goal
    });
  } catch (error) {
    console.error('Save goal error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// Get user goal
export async function getGoal(req, res) {
  const userId = req.user.id;
  try {
    const user = await User.findByPk(userId, {
      include: [{ model: Goal, as: 'goals', limit: 1, order: [['id', 'DESC']] }]
    });

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const goal = user.goals && user.goals.length > 0 ? user.goals[0] : null;
    return res.json(goal);
  } catch (error) {
    console.error('Get goal error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

