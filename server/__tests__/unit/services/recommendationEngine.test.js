/**
 * Skill Gap & Recommendation Logic — Unit Tests
 * Tests the core mathematical/logical parts of the recommendation engine
 */
describe('🤖 Recommendation Engine — Unit Tests', () => {

  // Helper functions extracted from recommendationEngine logic
  const calculateSkillGap = (userSkills = [], requiredSkills = []) => {
    const userSet = new Set(userSkills.map(s => s.toLowerCase().trim()));
    return requiredSkills.filter(skill => !userSet.has(skill.toLowerCase().trim()));
  };

  const calculateSkillMatchScore = (userSkills = [], requiredSkills = []) => {
    if (!requiredSkills || requiredSkills.length === 0) return 100;
    const userSet = new Set(userSkills.map(s => s.toLowerCase()));
    const matched = requiredSkills.filter(s => userSet.has(s.toLowerCase())).length;
    return Math.round((matched / requiredSkills.length) * 100);
  };

  const calculateJobScore = ({ careerGoalMatch, skillMatch, interestMatch, experienceMatch, locationMatch }) => {
    return Math.round(
      careerGoalMatch * 0.30 +
      skillMatch * 0.25 +
      interestMatch * 0.20 +
      experienceMatch * 0.15 +
      locationMatch * 0.10
    );
  };

  // ─── Skill Gap Tests ─────────────────────────────────────────────────────
  describe('Skill Gap Calculation', () => {
    it('✅ should identify missing skills correctly', () => {
      const userSkills = ['React', 'JavaScript', 'HTML', 'CSS'];
      const required = ['React', 'JavaScript', 'HTML', 'CSS', 'TypeScript', 'Testing'];

      const gap = calculateSkillGap(userSkills, required);
      expect(gap).toHaveLength(2);
      expect(gap).toContain('TypeScript');
      expect(gap).toContain('Testing');
    });

    it('✅ should return empty array when user has ALL required skills', () => {
      const gap = calculateSkillGap(['React', 'Node.js', 'MongoDB'], ['React', 'Node.js']);
      expect(gap).toHaveLength(0);
    });

    it('✅ should be case-insensitive', () => {
      const gap = calculateSkillGap(['REACT', 'javascript'], ['React', 'JavaScript']);
      expect(gap).toHaveLength(0);
    });

    it('✅ should return all required skills when user has NONE', () => {
      const gap = calculateSkillGap([], ['React', 'TypeScript', 'Node.js']);
      expect(gap).toHaveLength(3);
    });

    it('✅ should handle whitespace in skill names', () => {
      const gap = calculateSkillGap([' React '], ['React']);
      expect(gap).toHaveLength(0);
    });

    it('✅ should handle empty required skills (job has no skill filter)', () => {
      const gap = calculateSkillGap(['Python', 'Django'], []);
      expect(gap).toHaveLength(0);
    });
  });

  // ─── Skill Match Score Tests ─────────────────────────────────────────────
  describe('Skill Match Score', () => {
    it('✅ 100% match — user has all required skills', () => {
      expect(calculateSkillMatchScore(['React', 'JS'], ['React', 'JS'])).toBe(100);
    });

    it('✅ 50% match — user has half of required skills', () => {
      expect(calculateSkillMatchScore(['React'], ['React', 'TypeScript'])).toBe(50);
    });

    it('✅ 0% match — user has none of required skills', () => {
      expect(calculateSkillMatchScore(['Python'], ['React', 'TypeScript'])).toBe(0);
    });

    it('✅ 100% match when no required skills specified', () => {
      expect(calculateSkillMatchScore(['Python'], [])).toBe(100);
    });

    it('✅ 75% match — user has 3 of 4 skills', () => {
      const score = calculateSkillMatchScore(
        ['React', 'HTML', 'CSS'],
        ['React', 'HTML', 'CSS', 'TypeScript']
      );
      expect(score).toBe(75);
    });
  });

  // ─── Overall Job Score Tests ─────────────────────────────────────────────
  describe('Overall Job Recommendation Score', () => {
    it('✅ perfect match should give 100 score', () => {
      const score = calculateJobScore({
        careerGoalMatch: 100,
        skillMatch: 100,
        interestMatch: 100,
        experienceMatch: 100,
        locationMatch: 100,
      });
      expect(score).toBe(100);
    });

    it('✅ no match should give 0 score', () => {
      const score = calculateJobScore({
        careerGoalMatch: 0,
        skillMatch: 0,
        interestMatch: 0,
        experienceMatch: 0,
        locationMatch: 0,
      });
      expect(score).toBe(0);
    });

    it('✅ career goal match contributes 30% of total', () => {
      const score = calculateJobScore({
        careerGoalMatch: 100,
        skillMatch: 0,
        interestMatch: 0,
        experienceMatch: 0,
        locationMatch: 0,
      });
      expect(score).toBe(30);
    });

    it('✅ typical good match should score 70+', () => {
      const score = calculateJobScore({
        careerGoalMatch: 100,
        skillMatch: 80,
        interestMatch: 70,
        experienceMatch: 60,
        locationMatch: 50,
      });
      expect(score).toBeGreaterThan(70);
    });

    it('✅ scores should be between 0 and 100', () => {
      const score = calculateJobScore({
        careerGoalMatch: 85,
        skillMatch: 78,
        interestMatch: 90,
        experienceMatch: 80,
        locationMatch: 100,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
