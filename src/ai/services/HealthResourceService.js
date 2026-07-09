/**
 * HealthResourceService — Provides curated health education resources
 * from trusted medical organizations for each health topic.
 */
class HealthResourceService {
  constructor() {
    this.resources = this.buildResourceMap();
  }

  buildResourceMap() {
    return {
      malaria: [
        { title: 'WHO — Malaria', description: 'Fact sheet on malaria prevention, diagnosis, and treatment.', url: 'https://www.who.int/news-room/fact-sheets/detail/malaria' },
        { title: 'CDC — Malaria', description: 'Information about malaria transmission, symptoms, and prevention.', url: 'https://www.cdc.gov/malaria/about/' },
        { title: 'Nigeria NMEP', description: 'National Malaria Elimination Programme — prevention and treatment guidelines.', url: 'https://www.health.gov.ng/' },
      ],
      hiv: [
        { title: 'WHO — HIV/AIDS', description: 'Global HIV fact sheet with prevention, testing, and treatment information.', url: 'https://www.who.int/news-room/fact-sheets/detail/hiv-aids' },
        { title: 'CDC — HIV Basics', description: 'Comprehensive HIV information including PrEP, ART, and U=U.', url: 'https://www.cdc.gov/hiv/basics/' },
        { title: 'NACA Nigeria', description: 'National Agency for the Control of AIDS — Nigeria HIV guidelines.', url: 'https://naca.gov.ng/' },
      ],
      tb: [
        { title: 'WHO — Tuberculosis', description: 'TB fact sheet including symptoms, treatment, and drug-resistant TB.', url: 'https://www.who.int/news-room/fact-sheets/detail/tuberculosis' },
        { title: 'CDC — TB', description: 'Tuberculosis information, testing, and treatment guidelines.', url: 'https://www.cdc.gov/tb/topic/basics/' },
        { title: 'NTBLCP Nigeria', description: 'National TB and Leprosy Control Programme — Nigeria.', url: 'https://www.health.gov.ng/' },
      ],
      diabetes: [
        { title: 'WHO — Diabetes', description: 'Diabetes fact sheet with types, complications, and management.', url: 'https://www.who.int/news-room/fact-sheets/detail/diabetes' },
        { title: 'CDC — Diabetes', description: 'Diabetes management, prevention, and living with diabetes.', url: 'https://www.cdc.gov/diabetes/about/' },
        { title: 'Mayo Clinic — Diabetes', description: 'Patient-friendly diabetes overview, symptoms, and treatment.', url: 'https://www.mayoclinic.org/diseases-conditions/diabetes/symptoms-causes/syc-20371444' },
      ],
      hypertension: [
        { title: 'WHO — Hypertension', description: 'Key facts about high blood pressure and its management.', url: 'https://www.who.int/news-room/fact-sheets/detail/hypertension' },
        { title: 'CDC — High Blood Pressure', description: 'Hypertension prevention, management, and risk factors.', url: 'https://www.cdc.gov/bloodpressure/about.htm' },
        { title: 'NHS — High Blood Pressure', description: 'UK NHS guide to hypertension causes, treatment, and prevention.', url: 'https://www.nhs.uk/conditions/high-blood-pressure-hypertension/' },
      ],
      respiratory: [
        { title: 'WHO — Asthma', description: 'Asthma fact sheet with symptoms, triggers, and management.', url: 'https://www.who.int/news-room/fact-sheets/detail/asthma' },
        { title: 'CDC — Asthma', description: 'Asthma information including triggers, treatment, and action plans.', url: 'https://www.cdc.gov/asthma/faqs/' },
        { title: 'WHO — Pneumonia', description: 'Pneumonia fact sheet with causes, prevention, and treatment.', url: 'https://www.who.int/news-room/fact-sheets/detail/pneumonia' },
      ],
      sti: [
        { title: 'WHO — STIs', description: 'Sexually transmitted infections fact sheet with prevention and treatment.', url: 'https://www.who.int/news-room/fact-sheets/detail/sexually-transmitted-infections-(stis)' },
        { title: 'CDC — STI Facts', description: 'Detailed STI information including symptoms, testing, and treatment.', url: 'https://www.cdc.gov/std/healthcomm/fact_sheets.htm' },
        { title: 'NHS — STI Overview', description: 'UK NHS guide to sexually transmitted infections.', url: 'https://www.nhs.uk/conditions/sexually-transmitted-infections-stis/' },
      ],
      mental_health: [
        { title: 'WHO — Mental Health', description: 'Mental health fact sheet with key concepts and resources.', url: 'https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response' },
        { title: 'NHS — Mental Health', description: 'UK NHS mental health guide including depression, anxiety, and support.', url: 'https://www.nhs.uk/mental-health/' },
        { title: 'UNICEF — Adolescent Mental Health', description: 'Mental health information specifically for adolescents.', url: 'https://www.unicef.org/adolescents/mental-health' },
      ],
      nutrition: [
        { title: 'WHO — Nutrition', description: 'Global nutrition fact sheet with dietary recommendations.', url: 'https://www.who.int/news-room/fact-sheets/detail/nutrition' },
        { title: 'CDC — Nutrition', description: 'CDC nutrition information and healthy eating tips.', url: 'https://www.cdc.gov/nutrition/about-nutrition/index.html' },
        { title: 'NHS — Eat Well', description: 'UK NHS guide to healthy eating and balanced diet.', url: 'https://www.nhs.uk/live-well/eat-well/' },
      ],
      pregnancy: [
        { title: 'WHO — Maternal Health', description: 'Maternal health fact sheet with antenatal and postnatal care information.', url: 'https://www.who.int/news-room/fact-sheets/detail/maternal-health' },
        { title: 'CDC — Pregnancy', description: 'CDC pregnancy information including prenatal care and healthy pregnancy.', url: 'https://www.cdc.gov/pregnancy/about/index.html' },
        { title: 'UNICEF — Maternal and Newborn Health', description: 'Maternal and newborn health information.', url: 'https://www.unicef.org/health/maternal-and-newborn-health' },
      ],
      adolescent: [
        { title: 'WHO — Adolescent Health', description: 'Adolescent health fact sheet with key issues and interventions.', url: 'https://www.who.int/news-room/fact-sheets/detail/adolescents-health-risks-and-solutions' },
        { title: 'UNICEF — Adolescent Health', description: 'UNICEF adolescent health and development information.', url: 'https://www.unicef.org/adolescents' },
        { title: 'CDC — Adolescent Health', description: 'CDC adolescent health information and resources.', url: 'https://www.cdc.gov/healthyyouth/' },
      ],
      vaccination: [
        { title: 'WHO — Vaccines', description: 'Global vaccine fact sheet with safety and efficacy information.', url: 'https://www.who.int/news-room/fact-sheets/detail/immunization-coverage' },
        { title: 'CDC — Vaccines', description: 'CDC vaccine information including schedules and safety.', url: 'https://www.cdc.gov/vaccines/parents/index.html' },
        { title: 'UNICEF — Immunization', description: 'UNICEF immunization information for children.', url: 'https://www.unicef.org/immunization' },
      ],
      child_health: [
        { title: 'WHO — Child Health', description: 'Child health fact sheet with key child survival interventions.', url: 'https://www.who.int/news-room/fact-sheets/detail/children-health' },
        { title: 'UNICEF — Child Health', description: 'UNICEF child health and survival information.', url: 'https://www.unicef.org/health/child-health' },
        { title: 'CDC — Child Development', description: 'CDC child development and health information.', url: 'https://www.cdc.gov/ncbddd/childdevelopment/index.html' },
      ],
      first_aid: [
        { title: 'WHO — First Aid', description: 'WHO first aid guidance for common injuries and emergencies.', url: 'https://www.who.int/news-room/fact-sheets/detail/first-aid' },
        { title: 'Mayo Clinic — First Aid', description: 'Comprehensive first aid guide for common medical emergencies.', url: 'https://www.mayoclinic.org/first-aid' },
        { title: 'NHS — First Aid', description: 'UK NHS first aid guidance for adults, children, and babies.', url: 'https://www.nhs.uk/conditions/first-aid/' },
      ],
      general_health: [
        { title: 'WHO — Health Topics', description: 'Comprehensive health information from the World Health Organization.', url: 'https://www.who.int/health-topics/' },
        { title: 'CDC — Health Topics', description: 'CDC A-Z health topics with reliable health information.', url: 'https://www.cdc.gov/az/' },
        { title: 'MedlinePlus', description: 'US National Library of Medicine — trusted health information.', url: 'https://medlineplus.gov/' },
      ],
      medication: [
        { title: 'WHO — Essential Medicines', description: 'WHO model list of essential medicines with prescribing information.', url: 'https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines' },
        { title: 'MedlinePlus — Drugs', description: 'US National Library of Medicine drug information database.', url: 'https://medlineplus.gov/druginformation.html' },
        { title: 'NHS — Medicines', description: 'UK NHS guide to medicines, side effects, and safe usage.', url: 'https://www.nhs.uk/medicines/' },
      ],
      general: [
        { title: 'WHO — Health Topics', description: 'Comprehensive health information from the World Health Organization.', url: 'https://www.who.int/health-topics/' },
        { title: 'CDC — Health Topics A-Z', description: 'CDC reliable health information on a wide range of topics.', url: 'https://www.cdc.gov/az/' },
        { title: 'MedlinePlus', description: 'Trusted health information from the US National Library of Medicine.', url: 'https://medlineplus.gov/' },
      ],
    };
  }

  getResources(topic) {
    return this.resources[topic] || this.resources.general;
  }

  getResourcesForTopics(topics) {
    const seen = new Set();
    const results = [];
    for (const topic of topics) {
      const resources = this.getResources(topic);
      for (const r of resources) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          results.push(r);
          if (results.length >= 6) return results;
        }
      }
    }
    return results.slice(0, 6);
  }
}

module.exports = new HealthResourceService();
