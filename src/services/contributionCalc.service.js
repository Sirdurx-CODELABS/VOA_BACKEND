/**
 * VOA Contribution Calculation Engine
 * Single source of truth for all contribution amount logic.
 */

const Child = require('../models/Child');

// ── Rate tables ───────────────────────────────────────────────────────────────
const RATES = {
  child_under_13:       1000,   // per child per month
  adolescent_female:    1500,   // age 13–24
  adolescent_male:      2000,
  adult_female:         3500,   // age 25+
  adult_male:           4000,
};

/**
 * Calculate age from a date of birth.
 */
const calcAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

/**
 * Get the contribution rate for a single child based on age and gender.
 */
const getChildRate = (childDob, childGender) => {
  const age = calcAge(childDob);
  if (age === null) return 0;
  if (age < 13) return RATES.child_under_13;
  if (age <= 24) return childGender === 'female' ? RATES.adolescent_female : RATES.adolescent_male;
  // Child aged 25+ would be an adult — still counted under parent if linked
  return childGender === 'female' ? RATES.adult_female : RATES.adult_male;
};

/**
 * Calculate the required monthly contribution for a user.
 * Returns { requiredAmount, breakdown, calculationSource }
 */
const calculateRequiredContribution = async (user) => {
  const age = calcAge(user.dob);
  const gender = user.gender || 'other';
  const membershipType = user.membershipType || 'adult';

  // ── Parent/Guardian: contribution based on children only ─────────────────
  if (membershipType === 'parent_guardian') {
    const children = await Child.find({ parentId: user._id });
    if (children.length === 0) {
      return {
        requiredAmount: 0,
        breakdown: [],
        calculationSource: 'parent_no_children',
        note: 'No linked children. Add children to calculate contribution.',
      };
    }

    const breakdown = children.map(child => {
      const childAge = calcAge(child.childDob);
      const rate = getChildRate(child.childDob, child.childGender);
      let category;
      if (childAge === null) category = 'unknown';
      else if (childAge < 13) category = 'child_under_13';
      else if (childAge <= 24) category = child.childGender === 'female' ? 'adolescent_female' : 'adolescent_male';
      else category = child.childGender === 'female' ? 'adult_female' : 'adult_male';

      return {
        childId: child._id,
        childName: child.childName,
        childAge,
        childGender: child.childGender,
        category,
        amount: rate,
      };
    });

    const requiredAmount = breakdown.reduce((sum, b) => sum + b.amount, 0);
    return { requiredAmount, breakdown, calculationSource: 'parent_children' };
  }

  // ── Adolescent (age 13–24) ────────────────────────────────────────────────
  if (membershipType === 'adolescent' || (age !== null && age >= 13 && age <= 24)) {
    const rate = gender === 'female' ? RATES.adolescent_female : RATES.adolescent_male;
    return {
      requiredAmount: rate,
      breakdown: [{ category: membershipType === 'adolescent' ? 'adolescent' : 'adolescent_by_age', gender, amount: rate }],
      calculationSource: 'adolescent',
    };
  }

  // ── Adult (age 25+) ───────────────────────────────────────────────────────
  const rate = gender === 'female' ? RATES.adult_female : RATES.adult_male;
  return {
    requiredAmount: rate,
    breakdown: [{ category: 'adult', gender, amount: rate }],
    calculationSource: 'adult',
  };
};

/**
 * Get the minimum allowed single payment for a user.
 * For installments, any positive amount is allowed.
 */
const getMinimumPayment = () => 100; // ₦100 minimum per installment

/**
 * Derive membership type from DOB and whether the user has children.
 * - age 13–24 → adolescent
 * - age 25+   → adult (or parent_guardian if hasChildren is true)
 * @param {Date|string} dob
 * @param {boolean} hasChildren
 * @returns {'adolescent'|'adult'|'parent_guardian'}
 */
const deriveMembershipType = (dob, hasChildren = false) => {
  const age = calcAge(dob);
  if (age === null || age < 13) return 'adolescent'; // default for unknown/young
  if (age <= 24) return 'adolescent';
  // age 25+
  return hasChildren ? 'parent_guardian' : 'adult';
};

module.exports = { RATES, calcAge, getChildRate, calculateRequiredContribution, getMinimumPayment, deriveMembershipType };
