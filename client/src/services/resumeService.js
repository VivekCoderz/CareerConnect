/**
 * Resume AI Service (Frontend)
 * ----------------------------
 * Currently uses a smart mock that:
 *  - Never invents new skills / projects / experience
 *  - Only improves wording of what user provided
 *  - Returns structured JSON
 *
 * Later: replace the mock bodies with real fetch() to your Express endpoints.
 */

import { parseSkills, deepClone } from '../utils/resumeHelpers';

// ---------- MOCK AI HELPERS (replace with real API later) ----------

const improveBullet = (text) => {
  if (!text || !text.trim()) return text;
  let t = text.trim();

  // Capitalize first letter
  t = t.charAt(0).toUpperCase() + t.slice(1);

  // Simple action-verb boost if sentence is too plain
  const weakStarts = /^(worked on|did|made|helped|was responsible)/i;
  if (weakStarts.test(t)) {
    t = t.replace(weakStarts, (m) => {
      const map = {
        'worked on': 'Developed',
        did: 'Executed',
        made: 'Built',
        helped: 'Collaborated on',
        'was responsible': 'Owned',
      };
      return map[m.toLowerCase()] || m;
    });
  }

  // Ensure ends with period
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
};

const improveDescriptionToBullets = (rawDesc) => {
  if (!rawDesc || !rawDesc.trim()) return [];
  // Split by newlines or periods
  const parts = rawDesc
    .split(/[\n•]+|(?<=\.)\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.map(improveBullet);
};

const buildSummary = (raw) => {
  const name = raw.personal?.fullName || 'Professional';
  const skills = [
    ...parseSkills(raw.skills?.programmingLanguages),
    ...parseSkills(raw.skills?.frameworks),
  ].slice(0, 5);

  const skillText = skills.length ? ` skilled in ${skills.join(', ')}` : '';
  const edu = raw.education?.[0];
  const eduText = edu?.degree && edu?.branch ? ` with a background in ${edu.degree} (${edu.branch})` : '';

  return `${name} is a motivated and detail-oriented professional${eduText}${skillText}. Passionate about building impactful solutions and continuously learning new technologies.`;
};

/**
 * Mock: Convert raw user data → professional structured resume
 * NEVER invents data that user did not provide.
 */
const mockGenerate = (rawData, template) => {
  const raw = deepClone(rawData);

  const generated = {
    personal: { ...raw.personal },
    summary: buildSummary(raw),
    education: (raw.education || [])
      .filter((e) => e.college || e.degree)
      .map((e) => ({
        college: e.college,
        degree: e.degree,
        branch: e.branch,
        cgpa: e.cgpa,
        startYear: e.startYear,
        endYear: e.endYear,
      })),
    skills: {
      programmingLanguages: parseSkills(raw.skills?.programmingLanguages),
      frameworks: parseSkills(raw.skills?.frameworks),
      tools: parseSkills(raw.skills?.tools),
      other: parseSkills(raw.skills?.other),
    },
    projects: (raw.projects || [])
      .filter((p) => p.name)
      .map((p) => ({
        name: p.name,
        technologies: parseSkills(p.technologies).join(', '),
        description: improveDescriptionToBullets(p.description),
        github: p.github || '',
        live: p.live || '',
      })),
    experience: (raw.experience || [])
      .filter((e) => e.company || e.role)
      .map((e) => ({
        company: e.company,
        role: e.role,
        duration: e.duration,
        description: improveDescriptionToBullets(e.description),
      })),
    certifications: (raw.certifications || [])
      .filter((c) => c.name)
      .map((c) => ({
        name: c.name,
        issuer: c.issuer || '',
        year: c.year || '',
      })),
    achievements: (raw.achievements || [])
      .filter((a) => a.title || a.description)
      .map((a) => ({
        title: a.title,
        description: a.description ? improveBullet(a.description) : '',
      })),
    template, // keep selected template
  };

  return generated;
};

/**
 * Mock: Apply a user change instruction on existing generated resume
 * Only touches relevant sections, never invents new entries.
 */
const mockUpdate = (currentResume, instruction) => {
  const resume = deepClone(currentResume);
  const lower = (instruction || '').toLowerCase();

  // Summary length / focus
  if (lower.includes('shorter') && resume.summary) {
    const sentences = resume.summary.split(/\. /);
    resume.summary = sentences.slice(0, Math.max(1, sentences.length - 1)).join('. ') + '.';
  }
  if (lower.includes('longer') && resume.summary) {
    resume.summary += ' Eager to contribute to innovative projects and grow within a collaborative team environment.';
  }

  // Make descriptions more impactful
  if (lower.includes('impactful') || lower.includes('stronger') || lower.includes('better')) {
    resume.projects = (resume.projects || []).map((p) => ({
      ...p,
      description: (p.description || []).map((d) =>
        d.replace(/^(Developed|Built|Created)/, 'Architected and delivered')
      ),
    }));
    resume.experience = (resume.experience || []).map((e) => ({
      ...e,
      description: (e.description || []).map((d) =>
        d.startsWith('Owned') ? d : `Led and ${d.charAt(0).toLowerCase()}${d.slice(1)}`
      ),
    }));
  }

  // Focus on frontend
  if (lower.includes('frontend') || lower.includes('front-end')) {
    if (resume.summary) {
      resume.summary = resume.summary.replace(
        /professional/,
        'frontend-focused professional'
      );
    }
  }

  // Focus on backend / full-stack etc. can be extended similarly

  // Remove a section if asked
  if (lower.includes('remove') && lower.includes('certification')) {
    resume.certifications = [];
  }
  if (lower.includes('remove') && lower.includes('achievement')) {
    resume.achievements = [];
  }

  return resume;
};

// ---------- PUBLIC API (ready for real backend) ----------

export const generateResumeAPI = async (rawData, template) => {
  // TODO: Replace with real API call when backend is ready
  // const res = await fetch('/api/resume/generate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ rawData, template }),
  // });
  // if (!res.ok) throw new Error('Generation failed');
  // return res.json();

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 1200));
  return mockGenerate(rawData, template);
};

export const updateResumeAPI = async (currentResume, instruction) => {
  // TODO: Replace with real API call
  // const res = await fetch('/api/resume/update', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ currentResume, instruction }),
  // });
  // if (!res.ok) throw new Error('Update failed');
  // return res.json();

  await new Promise((r) => setTimeout(r, 900));
  return mockUpdate(currentResume, instruction);
};