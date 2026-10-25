// MBA assessment v1 (PRD R8): 50 questions, 60 minutes, 100 marks. 46 multiple choice (1 mark
// each, checked against the key), 3 written scenarios (12 marks each, AI with the rubric, then a
// reviewer), 1 speaking (18 marks, reviewer). Business awareness uses facts that do not change.

const mcq = (id, section, prompt, options, correct, extra = {}) => ({
  id,
  section,
  type: "mcq",
  prompt,
  options: options.map((text, i) => ({ id: "abcd"[i], text })),
  correctOptionId: correct,
  points: 1,
  ...extra,
});

const SALES_TABLE = `Quarterly sales (Rs lakh) of a company by region:
Region | Q1 | Q2 | Q3 | Q4
North  | 40 | 45 | 50 | 65
South  | 55 | 50 | 60 | 55
East   | 30 | 35 | 30 | 45
West   | 45 | 50 | 55 | 60`;
const di = (id, prompt, options, correct, explanation) => mcq(id, "di", prompt, options, correct, { context: SALES_TABLE, explanation });

const sections = [
  { key: "quant", title: "Quantitative Aptitude" },
  { key: "reasoning", title: "Logical Reasoning" },
  { key: "di", title: "Data Interpretation" },
  { key: "verbal", title: "Verbal Ability" },
  { key: "business", title: "Business Fundamentals" },
  { key: "sjt", title: "Situational Judgement" },
  { key: "awareness", title: "Business Awareness" },
  { key: "written", title: "Business Scenarios" },
  { key: "speaking", title: "Speaking" },
];

const WRITTEN_RUBRIC = (specific) => `Total 12 marks.
- Understanding of the problem (3): ${specific.understanding}
- Analysis (3): ${specific.analysis}
- Solution (4): ${specific.solution}
- Communication (2): clear structure, professional language, within 80 to 150 words.
Give 0 for an answer that is blank, off-topic or copied from the question.`;

const questions = [
  // Quantitative aptitude (8)
  mcq("q01", "quant", "A shirt marked at Rs 1,200 is sold at a 15% discount. What is the selling price?", ["Rs 1,020", "Rs 1,050", "Rs 1,080", "Rs 980"], "a", { explanation: "1,200 x 0.85 = 1,020" }),
  mcq("q02", "quant", "What is the simple interest on Rs 25,000 at 8% per year for 3 years?", ["Rs 5,600", "Rs 6,000", "Rs 6,400", "Rs 7,200"], "b", { explanation: "25,000 x 0.08 x 3 = 6,000" }),
  mcq("q03", "quant", "An item bought for Rs 400 is sold for Rs 500. What is the profit percentage?", ["20%", "25%", "30%", "15%"], "b", { explanation: "100 / 400 = 25%" }),
  mcq("q04", "quant", "The ratio of boys to girls in a class of 64 is 3 : 5. How many girls are there?", ["24", "36", "40", "44"], "c", { explanation: "64 x 5/8 = 40" }),
  mcq("q05", "quant", "A can finish a job in 12 days and B in 18 days. Working together, how long will they take?", ["7.2 days", "7.5 days", "8 days", "6.5 days"], "a", { explanation: "1/12 + 1/18 = 5/36, so 36/5 = 7.2 days" }),
  mcq("q06", "quant", "Monthly revenue rose from Rs 80 lakh to Rs 92 lakh. What is the percentage increase?", ["12%", "15%", "18%", "20%"], "b", { explanation: "12 / 80 = 15%" }),
  mcq("q07", "quant", "The average of five numbers is 42. If the number 50 is removed, what is the average of the remaining four?", ["38", "40", "41", "44"], "b", { explanation: "(210 - 50) / 4 = 40" }),
  mcq("q08", "quant", "Rs 10,000 is invested at 10% per year, compounded annually. What is the amount after 2 years?", ["Rs 12,000", "Rs 12,100", "Rs 12,200", "Rs 11,000"], "b", { explanation: "10,000 x 1.1 x 1.1 = 12,100" }),

  // Logical reasoning (7)
  mcq("q09", "reasoning", "What comes next in the series 3, 6, 12, 24, ...?", ["36", "42", "48", "30"], "c", { explanation: "Each term doubles" }),
  mcq("q10", "reasoning", "All managers are graduates. Some graduates are engineers. Which conclusion definitely follows?", ["All managers are engineers", "Some managers are engineers", "No manager is an engineer", "None of these follows definitely"], "d", { explanation: "The engineers among graduates may or may not include managers" }),
  mcq("q11", "reasoning", "In a code, SALES is written as TBMFT. How is PRICE written in the same code?", ["QSJDF", "QSKDF", "PSJDF", "QRJDF"], "a", { explanation: "Each letter moves one place forward" }),
  mcq("q12", "reasoning", "Ravi is taller than Amit. Amit is taller than Neha. Neha is taller than Priya. Who is the shortest?", ["Amit", "Neha", "Priya", "Cannot be determined"], "c"),
  mcq("q13", "reasoning", "You face north, turn right, turn right again, then turn left. Which direction do you face now?", ["North", "South", "East", "West"], "c", { explanation: "North, East, South, then East" }),
  mcq("q14", "reasoning", "Which number does not belong with the others: 5, 11, 17, 21?", ["5", "11", "17", "21"], "d", { explanation: "21 is the only one that is not prime" }),
  mcq("q15", "reasoning", "If the day after tomorrow is Friday, what day was yesterday?", ["Monday", "Tuesday", "Wednesday", "Thursday"], "b", { explanation: "Today is Wednesday" }),

  // Data interpretation (5), all on the same table
  di("q16", "Which region had the highest total sales for the year?", ["North", "South", "East", "West"], "b", "Totals: North 200, South 220, East 140, West 210"),
  di("q17", "What were the total sales of all regions in Q4?", ["Rs 215 lakh", "Rs 225 lakh", "Rs 235 lakh", "Rs 220 lakh"], "b", "65 + 55 + 45 + 60 = 225"),
  di("q18", "By what percentage did North's sales grow from Q1 to Q4?", ["50%", "55%", "62.5%", "65%"], "c", "(65 - 40) / 40 = 62.5%"),
  di("q19", "East's share of the company's total annual sales is closest to:", ["15%", "18%", "21%", "25%"], "b", "140 / 770 = 18.2%"),
  di("q20", "In how many regions were Q3 sales higher than Q2 sales?", ["1", "2", "3", "4"], "c", "North, South and West"),

  // Verbal ability (5)
  mcq("q21", "verbal", "Choose the word closest in meaning to PRUDENT.", ["Careless", "Wise", "Proud", "Quick"], "b"),
  mcq("q22", "verbal", "Choose the word opposite in meaning to EXPAND.", ["Grow", "Contract", "Extend", "Widen"], "b"),
  mcq("q23", "verbal", "Fill in the blank: The manager asked the team to ____ the report by Friday.", ["submit", "submits", "submitted", "submitting"], "a"),
  mcq("q24", "verbal", "Which sentence is grammatically correct?", ["Neither of the candidates were selected.", "Neither of the candidates was selected.", "Neither of the candidate was selected.", "Neither the candidates was selected."], "b"),
  mcq("q25", "verbal", "What does the idiom \"to cut corners\" mean?", ["To save time or money by doing something badly", "To take a shortcut while driving", "To shorten a document", "To finish work early"], "a"),

  // Business fundamentals (12): marketing, finance, HR, operations
  mcq("q26", "business", "The 4 Ps of marketing are Product, Price, Place and:", ["Profit", "Promotion", "People", "Process"], "b"),
  mcq("q27", "business", "Market segmentation means:", ["Dividing a market into groups of customers with similar needs", "Selling the same product in every market", "Reducing the price to gain market share", "Opening new retail outlets"], "a"),
  mcq("q28", "business", "A product is cheaper than competitors at launch to win customers quickly. This pricing strategy is called:", ["Skimming pricing", "Penetration pricing", "Premium pricing", "Cost-plus pricing"], "b"),
  mcq("q29", "business", "A company has current assets of Rs 6 lakh and current liabilities of Rs 3 lakh. What is its current ratio?", ["0.5 : 1", "1 : 1", "2 : 1", "3 : 1"], "c", { explanation: "6 / 3 = 2" }),
  mcq("q30", "business", "Which statement shows a company's financial position (assets and liabilities) on a given date?", ["Income statement", "Cash flow statement", "Balance sheet", "Budget"], "c"),
  mcq("q31", "business", "Fixed costs are Rs 2,00,000, the price is Rs 500 per unit and the variable cost is Rs 300 per unit. What is the break-even quantity?", ["400 units", "667 units", "1,000 units", "2,000 units"], "c", { explanation: "2,00,000 / (500 - 300) = 1,000" }),
  mcq("q32", "business", "Working capital is calculated as:", ["Total assets minus total liabilities", "Current assets minus current liabilities", "Revenue minus expenses", "Equity plus long-term debt"], "b"),
  mcq("q33", "business", "In HR, the attrition rate measures:", ["How fast new employees are hired", "The rate at which employees leave the organisation", "The share of employees who get promoted", "Average salary growth"], "b"),
  mcq("q34", "business", "In Maslow's hierarchy of needs, which is the highest level?", ["Safety", "Esteem", "Self-actualisation", "Belonging"], "c"),
  mcq("q35", "business", "Just-in-Time (JIT) inventory mainly aims to:", ["Keep large stocks to avoid shortages", "Receive materials only when they are needed, reducing inventory", "Buy materials when prices are lowest", "Produce goods before orders arrive"], "b"),
  mcq("q36", "business", "In a production process, a bottleneck is:", ["The fastest stage of the process", "The stage with the lowest capacity, which limits total output", "The final quality check", "The warehouse where goods are stored"], "b"),
  mcq("q37", "business", "Six Sigma is mainly used to:", ["Increase advertising reach", "Reduce defects and variation in processes", "Raise employee salaries", "Plan company taxes"], "b"),

  // Situational judgement (6): the best first response
  mcq("q38", "sjt", "You lead a project and one team member keeps missing deadlines. What is the best first step?", ["Report them to senior management at once", "Talk to them privately to understand why and agree on a plan", "Quietly move all their work to others", "Ignore it until the project ends"], "b"),
  mcq("q39", "sjt", "A customer complains loudly about a delayed order in front of other customers. What is the best response?", ["Ask them to leave", "Listen calmly, apologise, and give a clear update and next step", "Blame the delivery partner", "Offer a full refund at once without checking"], "b"),
  mcq("q40", "sjt", "You find a small error in a report already sent to a client. What should you do?", ["Wait and see if the client notices", "Tell your manager, correct it, and send the corrected version with a short note", "Correct only your own copy", "Blame the data source"], "b"),
  mcq("q41", "sjt", "Two team members disagree strongly about how to do a task, and the team is slowing down. What is the best action?", ["Choose the more senior person's approach", "Bring them together, compare both approaches against the goal, and agree on one", "Let each do it their own way", "Escalate to HR immediately"], "b"),
  mcq("q42", "sjt", "Your manager gives you an urgent task while you are close to another deadline. What should you do?", ["Do both tasks halfway", "Explain your current deadline and ask which one to prioritise", "Refuse the new task", "Work overtime without telling anyone"], "b"),
  mcq("q43", "sjt", "A vendor offers you a personal gift to help them win a contract. What should you do?", ["Accept it quietly", "Decline it and report it as per company policy", "Accept it but still judge the bids fairly", "Ask for a bigger gift"], "b"),

  // Business awareness (3)
  mcq("q44", "awareness", "Which body regulates the securities market in India?", ["RBI", "SEBI", "IRDAI", "NITI Aayog"], "b"),
  mcq("q45", "awareness", "Who decides the repo rate in India?", ["Ministry of Finance", "SEBI", "The Monetary Policy Committee of the RBI", "NITI Aayog"], "c"),
  mcq("q46", "awareness", "UPI (Unified Payments Interface) was developed by:", ["Reserve Bank of India", "National Payments Corporation of India (NPCI)", "State Bank of India", "NITI Aayog"], "b"),

  // Business scenarios (3), written
  {
    id: "q47", section: "written", type: "written", points: 12, minWords: 80, maxWords: 150,
    prompt: "You are the marketing manager of a mid-sized FMCG company. Sales of your new juice brand fell 20% last quarter, and a competitor has launched a cheaper product. In 80 to 150 words, explain how you would find the cause and what two actions you would take.",
    rubric: WRITTEN_RUBRIC({
      understanding: "sees that the fall may come from the cheaper competitor but also checks other causes (distribution, quality, season).",
      analysis: "says what data to look at: sales by region and channel, price comparison, customer and retailer feedback.",
      solution: "gives two clear, practical actions (for example a value pack or promotion, stronger differentiation, better shelf presence) and the expected effect.",
    }),
  },
  {
    id: "q48", section: "written", type: "written", points: 12, minWords: 80, maxWords: 150,
    prompt: "Your team of eight has missed two project deadlines and morale is low. As team lead, describe in 80 to 150 words what you would do in the next two weeks.",
    rubric: WRITTEN_RUBRIC({
      understanding: "recognises both the delivery problem and the morale problem.",
      analysis: "finds the causes by talking to the team and reviewing workload, priorities and clarity of goals.",
      solution: "gives a concrete plan: re-prioritise, clear roles and short deadlines, regular check-ins, support and recognition.",
    }),
  },
  {
    id: "q49", section: "written", type: "written", points: 12, minWords: 80, maxWords: 150,
    prompt: "A bank wants more customers above 50 years of age to use its mobile banking app. In 80 to 150 words, suggest a plan.",
    rubric: WRITTEN_RUBRIC({
      understanding: "identifies likely barriers: trust and fear of fraud, ease of use, digital confidence.",
      analysis: "links each action to a barrier and to this customer group.",
      solution: "gives practical actions (assisted sign-up in branches, simpler screens and larger text, clear safety assurance, family or referral help) and says how success will be measured (active users, transactions).",
    }),
  },

  // Speaking (1)
  {
    id: "q50", section: "speaking", type: "speaking", points: 18, maxSeconds: 90,
    prompt: "Introduce yourself. Explain why you chose an MBA and what role you want after it. Speak for 60 to 90 seconds.",
    rubric: "Total 18 marks. Clarity of speech (5); fluency and confidence (5); content and structure: introduction, reason for MBA, target role and why (8).",
  },
];

const instructions = [
  "50 questions in 60 minutes. You have one attempt.",
  "Your answers are saved as you go. If your connection drops, open the test again to continue; the timer keeps running.",
  "The test runs in full screen with your camera and microphone on. Leaving full screen or switching tabs is recorded; after 3 times the test is submitted automatically.",
  "Copy and paste are turned off.",
  "Multiple-choice answers are checked automatically. Written answers are checked against a marking guide and reviewed by the assessment team. The speaking answer is reviewed by the assessment team.",
  "The test is submitted automatically when the time is up.",
].join("\n");

module.exports = { title: "MBA Assessment 2026", sections, questions, instructions, timeLimitMinutes: 60 };
