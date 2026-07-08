const hospitals = [
  // ── FCT ──
  { name: 'National Hospital Abuja', state: 'FCT', lga: 'Municipal Area Council', address: 'Plot 432, Independence Central Area, Garki', phone: '+2348031234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'University of Abuja Teaching Hospital', state: 'FCT', lga: 'Municipal Area Council', address: 'Gwagwalada, Abuja', phone: '+2348032345678', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Maitama District Hospital', state: 'FCT', lga: 'Municipal Area Council', address: 'Maitama, Abuja', phone: '+2348033456789', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Asokoro District Hospital', state: 'FCT', lga: 'Municipal Area Council', address: 'Asokoro, Abuja', phone: '+2348034567890', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Wuse General Hospital', state: 'FCT', lga: 'Municipal Area Council', address: 'Wuse Zone 1, Abuja', phone: '+2348035678901', hasEmergency: true, hasArtServices: true },
  { name: 'Garki Hospital Abuja', state: 'FCT', lga: 'Municipal Area Council', address: 'Garki, Abuja', phone: '+2348036789012', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Nyanya General Hospital', state: 'FCT', lga: 'Municipal Area Council', address: 'Nyanya, Abuja', phone: '+2348037890123', hasEmergency: true, hasArtServices: true },
  { name: 'Kubwa General Hospital', state: 'FCT', lga: 'Bwari', address: 'Kubwa, Abuja', phone: '+2348038901234', hasEmergency: true, hasArtServices: true },
  { name: 'Bwari General Hospital', state: 'FCT', lga: 'Bwari', address: 'Bwari, Abuja', phone: '+2348039012345', hasEmergency: true, hasArtServices: true },
  { name: 'Abaji General Hospital', state: 'FCT', lga: 'Abaji', address: 'Abaji, Abuja', phone: '+2348040123456', hasEmergency: true, hasArtServices: true },
  { name: 'Kwali General Hospital', state: 'FCT', lga: 'Kwali', address: 'Kwali, Abuja', phone: '+2348041234567', hasEmergency: true, hasArtServices: true },

  // ── Lagos ──
  { name: 'Lagos University Teaching Hospital (LUTH)', state: 'Lagos', lga: 'Surulere', address: '1 Ishaga Road, Idi-Araba, Surulere, Lagos', phone: '+2348021234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Lagos State University Teaching Hospital (LASUTH)', state: 'Lagos', lga: 'Ikeja', address: '1 Normal Avenue, Ikeja, Lagos', phone: '+2348022345678', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Eko Hospital', state: 'Lagos', lga: 'Ikeja', address: '31 Mobolaji Bank Anthony Way, Ikeja, Lagos', phone: '+2348023456789', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Reddington Hospital', state: 'Lagos', lga: 'Ikeja', address: '12 Idowu Martins Street, Ikeja, Lagos', phone: '+2348024567890', hasEmergency: true, hasArtServices: true },
  { name: 'St. Nicholas Hospital', state: 'Lagos', lga: 'Lagos Island', address: '57 Campbell Street, Lagos Island', phone: '+2348025678901', hasEmergency: true, hasArtServices: true },
  { name: 'Lagos Island Maternity Hospital', state: 'Lagos', lga: 'Lagos Island', address: 'Broad Street, Lagos Island', phone: '+2348026789012', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Lagos (Massey Street)', state: 'Lagos', lga: 'Lagos Island', address: 'Massey Street, Lagos Island', phone: '+2348027890123', hasEmergency: true, hasArtServices: true },
  { name: 'Gbagada General Hospital', state: 'Lagos', lga: 'Shomolu', address: '1 Hospital Road, Gbagada, Lagos', phone: '+2348028901234', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Isolo General Hospital', state: 'Lagos', lga: 'Oshodi-Isolo', address: 'Isolo, Lagos', phone: '+2348029012345', hasEmergency: true, hasArtServices: true },
  { name: 'Badagry General Hospital', state: 'Lagos', lga: 'Badagry', address: 'Badagry, Lagos', phone: '+2348030123456', hasEmergency: true, hasArtServices: true },
  { name: 'Ikorodu General Hospital', state: 'Lagos', lga: 'Ikorodu', address: 'Ikorodu, Lagos', phone: '+2348031234567', hasEmergency: true, hasArtServices: true },
  { name: 'Epe General Hospital', state: 'Lagos', lga: 'Epe', address: 'Epe, Lagos', phone: '+2348032345678', hasEmergency: true, hasArtServices: true },
  { name: 'Ayinke House (LASUTH Ikeja)', state: 'Lagos', lga: 'Ikeja', address: 'Ikeja, Lagos', phone: '+2348033456789', hasEmergency: true, hasArtServices: true },
  { name: 'Military Hospital Lagos (NMRI)', state: 'Lagos', lga: 'Yaba', address: 'Yaba, Lagos', phone: '+2348034567890', hasEmergency: true, hasArtServices: true },
  { name: 'Federal Medical Centre Ebute Metta', state: 'Lagos', lga: 'Lagos Mainland', address: 'Ebute Metta, Lagos', phone: '+2348035678901', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'St. Ives Specialist Hospital', state: 'Lagos', lga: 'Ikeja', address: 'Ikeja, Lagos', phone: '+2348036789012', hasEmergency: true, hasArtServices: true },
  { name: 'Preston Specialist Hospital', state: 'Lagos', lga: 'Ikeja', address: 'Ikeja, Lagos', phone: '+2348037890123', hasEmergency: true, hasArtServices: true },

  // ── Oyo ──
  { name: 'University College Hospital (UCH) Ibadan', state: 'Oyo', lga: 'Ibadan North', address: 'Queen Elizabeth Road, Ibadan', phone: '+2348051234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Adeoyo Maternity Hospital', state: 'Oyo', lga: 'Ibadan North', address: 'Adeoyo, Ibadan', phone: '+2348052345678', hasEmergency: true, hasArtServices: true },
  { name: 'Ring Road State Hospital', state: 'Oyo', lga: 'Ibadan South West', address: 'Ring Road, Ibadan', phone: '+2348053456789', hasEmergency: true, hasArtServices: true },
  { name: 'Jericho Specialist Hospital', state: 'Oyo', lga: 'Ibadan North', address: 'Jericho, Ibadan', phone: '+2348054567890', hasEmergency: true, hasArtServices: true },
  { name: 'St. Mary\'s Hospital', state: 'Oyo', lga: 'Ibadan North', address: 'Eleyele, Ibadan', phone: '+2348055678901', hasEmergency: true, hasArtServices: true },
  { name: 'Catholic Hospital Oyo', state: 'Oyo', lga: 'Oyo West', address: 'Oyo Town, Oyo State', phone: '+2348056789012', hasEmergency: true, hasArtServices: true },

  // ── Kaduna ──
  { name: 'Ahmadu Bello University Teaching Hospital (ABUTH)', state: 'Kaduna', lga: 'Zaria', address: 'Zaria, Kaduna State', phone: '+2348061234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Barau Dikko Teaching Hospital', state: 'Kaduna', lga: 'Kaduna North', address: 'Kaduna, Kaduna State', phone: '+2348062345678', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: '44 Nigerian Army Reference Hospital', state: 'Kaduna', lga: 'Kaduna North', address: 'Kaduna, Kaduna State', phone: '+2348063456789', hasEmergency: true, hasArtServices: true },
  { name: 'St. Gerard\'s Catholic Hospital', state: 'Kaduna', lga: 'Kaduna South', address: 'Kakuri, Kaduna', phone: '+2348064567890', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Kafanchan', state: 'Kaduna', lga: 'Jema\'a', address: 'Kafanchan, Kaduna State', phone: '+2348065678901', hasEmergency: true, hasArtServices: true },

  // ── Kano ──
  { name: 'Aminu Kano Teaching Hospital (AKTH)', state: 'Kano', lga: 'Kano Municipal', address: 'No 1 Zaria Road, Kano', phone: '+2348071234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Murtala Mohammed Specialist Hospital', state: 'Kano', lga: 'Kano Municipal', address: 'Kano, Kano State', phone: '+2348072345678', hasEmergency: true, hasArtServices: true },
  { name: 'Hasiya Bayero Paediatric Hospital', state: 'Kano', lga: 'Kano Municipal', address: 'Kano, Kano State', phone: '+2348073456789', hasEmergency: true, hasArtServices: true },
  { name: 'Muhammad Abdullahi Wase Specialist Hospital', state: 'Kano', lga: 'Nasarawa', address: 'Kano, Kano State', phone: '+2348074567890', hasEmergency: true, hasArtServices: true },
  { name: 'National Orthopaedic Hospital Dala', state: 'Kano', lga: 'Dala', address: 'Dala, Kano State', phone: '+2348075678901', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Wudil', state: 'Kano', lga: 'Wudil', address: 'Wudil, Kano State', phone: '+2348076789012', hasEmergency: true, hasArtServices: true },

  // ── Rivers ──
  { name: 'University of Port Harcourt Teaching Hospital (UPTH)', state: 'Rivers', lga: 'Port Harcourt', address: 'Port Harcourt, Rivers State', phone: '+2348081234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Braithwaite Memorial Specialist Hospital', state: 'Rivers', lga: 'Port Harcourt', address: 'Port Harcourt, Rivers State', phone: '+2348082345678', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Military Hospital Port Harcourt', state: 'Rivers', lga: 'Port Harcourt', address: 'Port Harcourt, Rivers State', phone: '+2348083456789', hasEmergency: true, hasArtServices: true },
  { name: 'Mercy Hospital', state: 'Rivers', lga: 'Port Harcourt', address: 'Abuloma, Port Harcourt', phone: '+2348084567890', hasEmergency: true, hasArtServices: true },
  { name: 'St. John\'s Hospital', state: 'Rivers', lga: 'Port Harcourt', address: 'Port Harcourt, Rivers State', phone: '+2348085678901', hasEmergency: true, hasArtServices: true },

  // ── Enugu ──
  { name: 'University of Nigeria Teaching Hospital (UNTH)', state: 'Enugu', lga: 'Nsukka', address: 'Nsukka, Enugu State', phone: '+2348091234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Enugu State University Teaching Hospital (ESUTH)', state: 'Enugu', lga: 'Enugu North', address: 'Parklane, Enugu', phone: '+2348092345678', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'National Orthopaedic Hospital Enugu', state: 'Enugu', lga: 'Enugu North', address: 'Enugu, Enugu State', phone: '+2348093456789', hasEmergency: true, hasArtServices: true },
  { name: 'Bishop Shanahan Hospital', state: 'Enugu', lga: 'Nsukka', address: 'Nsukka, Enugu State', phone: '+2348094567890', hasEmergency: true, hasArtServices: true },
  { name: 'Nigerian Coal Corporation Hospital', state: 'Enugu', lga: 'Enugu North', address: 'Enugu, Enugu State', phone: '+2348095678901', hasEmergency: true, hasArtServices: true },

  // ── Anambra ──
  { name: 'Nnamdi Azikiwe University Teaching Hospital (NAUTH)', state: 'Anambra', lga: 'Ihiala', address: 'Nnewi, Anambra State', phone: '+2348101234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Chukwuemeka Odumegwu Ojukwu University Teaching Hospital', state: 'Anambra', lga: 'Awka South', address: 'Awka, Anambra State', phone: '+2348102345678', hasEmergency: true, hasArtServices: true },
  { name: 'Our Lady of Lourdes Hospital', state: 'Anambra', lga: 'Ihiala', address: 'Ihiala, Anambra State', phone: '+2348103456789', hasEmergency: true, hasArtServices: true },
  { name: 'St. Joseph\'s Hospital', state: 'Anambra', lga: 'Adazi-Nnukwu', address: 'Adazi-Nnukwu, Anambra State', phone: '+2348104567890', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Onitsha', state: 'Anambra', lga: 'Onitsha North', address: 'Onitsha, Anambra State', phone: '+2348105678901', hasEmergency: true, hasArtServices: true },

  // ── Delta ──
  { name: 'Delta State University Teaching Hospital (DELSUTH)', state: 'Delta', lga: 'Oghara', address: 'Oghara, Delta State', phone: '+2348111234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Federal Medical Centre Asaba', state: 'Delta', lga: 'Oshimili South', address: 'Asaba, Delta State', phone: '+2348112345678', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Central Hospital Warri', state: 'Delta', lga: 'Warri South', address: 'Warri, Delta State', phone: '+2348113456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Sapele', state: 'Delta', lga: 'Sapele', address: 'Sapele, Delta State', phone: '+2348114567890', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ughelli', state: 'Delta', lga: 'Ughelli North', address: 'Ughelli, Delta State', phone: '+2348115678901', hasEmergency: true, hasArtServices: true },

  // ── Ogun ──
  { name: 'Federal Medical Centre Abeokuta', state: 'Ogun', lga: 'Abeokuta South', address: 'Abeokuta, Ogun State', phone: '+2348121234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Olabisi Onabanjo University Teaching Hospital (OOUTH)', state: 'Ogun', lga: 'Sagamu', address: 'Sagamu, Ogun State', phone: '+2348122345678', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'State Hospital Ijaye', state: 'Ogun', lga: 'Abeokuta North', address: 'Abeokuta, Ogun State', phone: '+2348123456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ilaro', state: 'Ogun', lga: 'Egbado South', address: 'Ilaro, Ogun State', phone: '+2348124567890', hasEmergency: true, hasArtServices: true },

  // ── Edo ──
  { name: 'University of Benin Teaching Hospital (UBTH)', state: 'Edo', lga: 'Oredo', address: 'Benin City, Edo State', phone: '+2348131234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Irina Specialist Hospital', state: 'Edo', lga: 'Oredo', address: 'Benin City, Edo State', phone: '+2348132345678', hasEmergency: true, hasArtServices: true },
  { name: 'Central Hospital Benin', state: 'Edo', lga: 'Oredo', address: 'Benin City, Edo State', phone: '+2348133456789', hasEmergency: true, hasArtServices: true },
  { name: 'Stella Obasanjo Hospital', state: 'Edo', lga: 'Oredo', address: 'Benin City, Edo State', phone: '+2348134567890', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Auchi', state: 'Edo', lga: 'Etsako West', address: 'Auchi, Edo State', phone: '+2348135678901', hasEmergency: true, hasArtServices: true },

  // ── Plateau ──
  { name: 'Jos University Teaching Hospital (JUTH)', state: 'Plateau', lga: 'Jos North', address: 'Jos, Plateau State', phone: '+2348141234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Plateau State Specialist Hospital', state: 'Plateau', lga: 'Jos North', address: 'Jos, Plateau State', phone: '+2348142345678', hasEmergency: true, hasArtServices: true },
  { name: 'National Veterinary Research Institute Clinic', state: 'Plateau', lga: 'Jos North', address: 'Vom, Jos, Plateau State', phone: '+2348143456789', hasEmergency: false, hasArtServices: false },
  { name: 'General Hospital Pankshin', state: 'Plateau', lga: 'Pankshin', address: 'Pankshin, Plateau State', phone: '+2348144567890', hasEmergency: true, hasArtServices: true },
  { name: 'Our Lady of Apostles Hospital', state: 'Plateau', lga: 'Jos South', address: 'Jenta, Jos, Plateau State', phone: '+2348145678901', hasEmergency: true, hasArtServices: true },

  // ── Borno ──
  { name: 'University of Maiduguri Teaching Hospital (UMTH)', state: 'Borno', lga: 'Maiduguri', address: 'Maiduguri, Borno State', phone: '+2348151234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'State Specialist Hospital Maiduguri', state: 'Borno', lga: 'Maiduguri', address: 'Maiduguri, Borno State', phone: '+2348152345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Biu', state: 'Borno', lga: 'Biu', address: 'Biu, Borno State', phone: '+2348153456789', hasEmergency: true, hasArtServices: true },

  // ── Kogi ──
  { name: 'Federal Medical Centre Lokoja', state: 'Kogi', lga: 'Lokoja', address: 'Lokoja, Kogi State', phone: '+2348161234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Reference Hospital Okene', state: 'Kogi', lga: 'Okene', address: 'Okene, Kogi State', phone: '+2348162345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Kabba', state: 'Kogi', lga: 'Kabba/Bunu', address: 'Kabba, Kogi State', phone: '+2348163456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ankpa', state: 'Kogi', lga: 'Ankpa', address: 'Ankpa, Kogi State', phone: '+2348164567890', hasEmergency: true, hasArtServices: true },

  // ── Kwara ──
  { name: 'University of Ilorin Teaching Hospital (UITH)', state: 'Kwara', lga: 'Ilorin South', address: 'Ilorin, Kwara State', phone: '+2348171234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Sobi Specialist Hospital', state: 'Kwara', lga: 'Ilorin West', address: 'Ilorin, Kwara State', phone: '+2348172345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Offa', state: 'Kwara', lga: 'Offa', address: 'Offa, Kwara State', phone: '+2348173456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Kaiama', state: 'Kwara', lga: 'Kaiama', address: 'Kaiama, Kwara State', phone: '+2348174567890', hasEmergency: true, hasArtServices: true },

  // ── Nasarawa ──
  { name: 'Federal Medical Centre Keffi', state: 'Nasarawa', lga: 'Keffi', address: 'Keffi, Nasarawa State', phone: '+2348181234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Dalhatu Araf Specialist Hospital', state: 'Nasarawa', lga: 'Lafia', address: 'Lafia, Nasarawa State', phone: '+2348182345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Nassarawa', state: 'Nasarawa', lga: 'Nasarawa', address: 'Nasarawa Town, Nasarawa State', phone: '+2348183456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Akwanga', state: 'Nasarawa', lga: 'Akwanga', address: 'Akwanga, Nasarawa State', phone: '+2348184567890', hasEmergency: true, hasArtServices: true },

  // ── Niger ──
  { name: 'Ibrahim Badamasi Babangida Specialist Hospital', state: 'Niger', lga: 'Minna', address: 'Minna, Niger State', phone: '+2348191234567', hasEmergency: true, hasArtServices: true },
  { name: 'Federal Medical Centre Bida', state: 'Niger', lga: 'Bida', address: 'Bida, Niger State', phone: '+2348192345678', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Federal Medical Centre Minna', state: 'Niger', lga: 'Minna', address: 'Minna, Niger State', phone: '+2348211234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'General Hospital Suleja', state: 'Niger', lga: 'Suleja', address: 'Suleja, Niger State', phone: '+2348212345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Kontagora', state: 'Niger', lga: 'Kontagora', address: 'Kontagora, Niger State', phone: '+2348193456789', hasEmergency: true, hasArtServices: true },

  // ── Sokoto ──
  { name: 'Usmanu Danfodiyo University Teaching Hospital (UDUTH)', state: 'Sokoto', lga: 'Sokoto North', address: 'Sokoto, Sokoto State', phone: '+2348021234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Specialist Hospital Sokoto', state: 'Sokoto', lga: 'Sokoto South', address: 'Sokoto, Sokoto State', phone: '+2348022345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Tambuwal', state: 'Sokoto', lga: 'Tambuwal', address: 'Tambuwal, Sokoto State', phone: '+2348023456789', hasEmergency: true, hasArtServices: true },

  // ── Bauchi ──
  { name: 'Abubakar Tafawa Balewa University Teaching Hospital (ATBUTH)', state: 'Bauchi', lga: 'Bauchi', address: 'Bauchi, Bauchi State', phone: '+2348031234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'General Hospital Azare', state: 'Bauchi', lga: 'Katagum', address: 'Azare, Bauchi State', phone: '+2348032345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Misau', state: 'Bauchi', lga: 'Misau', address: 'Misau, Bauchi State', phone: '+2348033456789', hasEmergency: true, hasArtServices: true },

  // ── Benue ──
  { name: 'Benue State University Teaching Hospital (BSUTH)', state: 'Benue', lga: 'Makurdi', address: 'Makurdi, Benue State', phone: '+2348041234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Federal Medical Centre Makurdi', state: 'Benue', lga: 'Makurdi', address: 'Makurdi, Benue State', phone: '+2348042345678', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'General Hospital Otukpo', state: 'Benue', lga: 'Oturkpo', address: 'Otukpo, Benue State', phone: '+2348043456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Gboko', state: 'Benue', lga: 'Gboko', address: 'Gboko, Benue State', phone: '+2348044567890', hasEmergency: true, hasArtServices: true },

  // ── Cross River ──
  { name: 'University of Calabar Teaching Hospital (UCTH)', state: 'Cross River', lga: 'Calabar Municipal', address: 'Calabar, Cross River State', phone: '+2348051234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'General Hospital Calabar', state: 'Cross River', lga: 'Calabar Municipal', address: 'Calabar, Cross River State', phone: '+2348052345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ogoja', state: 'Cross River', lga: 'Ogoja', address: 'Ogoja, Cross River State', phone: '+2348053456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ikom', state: 'Cross River', lga: 'Ikom', address: 'Ikom, Cross River State', phone: '+2348054567890', hasEmergency: true, hasArtServices: true },

  // ── Akwa Ibom ──
  { name: 'University of Uyo Teaching Hospital (UUTH)', state: 'Akwa Ibom', lga: 'Uyo', address: 'Uyo, Akwa Ibom State', phone: '+2348061234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'St. Luke\'s Hospital', state: 'Akwa Ibom', lga: 'Uyo', address: 'Uyo, Akwa Ibom State', phone: '+2348062345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ikot Ekpene', state: 'Akwa Ibom', lga: 'Ikot Ekpene', address: 'Ikot Ekpene, Akwa Ibom State', phone: '+2348063456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Eket', state: 'Akwa Ibom', lga: 'Eket', address: 'Eket, Akwa Ibom State', phone: '+2348064567890', hasEmergency: true, hasArtServices: true },

  // ── Imo ──
  { name: 'Imo State University Teaching Hospital (IMSUTH)', state: 'Imo', lga: 'Orlu', address: 'Orlu, Imo State', phone: '+2348071234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Federal Medical Centre Owerri', state: 'Imo', lga: 'Owerri Municipal', address: 'Owerri, Imo State', phone: '+2348072345678', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'General Hospital Okigwe', state: 'Imo', lga: 'Okigwe', address: 'Okigwe, Imo State', phone: '+2348073456789', hasEmergency: true, hasArtServices: true },
  { name: 'Holy Rosary Hospital', state: 'Imo', lga: 'Owerri Municipal', address: 'Owerri, Imo State', phone: '+2348074567890', hasEmergency: true, hasArtServices: true },

  // ── Ebonyi ──
  { name: 'Alex Ekwueme Federal University Teaching Hospital (AEFUTHA)', state: 'Ebonyi', lga: 'Abakaliki', address: 'Abakaliki, Ebonyi State', phone: '+2348081234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Federal Medical Centre Abakaliki', state: 'Ebonyi', lga: 'Abakaliki', address: 'Abakaliki, Ebonyi State', phone: '+2348082345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Afikpo', state: 'Ebonyi', lga: 'Afikpo North', address: 'Afikpo, Ebonyi State', phone: '+2348083456789', hasEmergency: true, hasArtServices: true },

  // ── Gombe ──
  { name: 'Federal Teaching Hospital Gombe', state: 'Gombe', lga: 'Gombe', address: 'Gombe, Gombe State', phone: '+2348091234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'General Hospital Kaltungo', state: 'Gombe', lga: 'Kaltungo', address: 'Kaltungo, Gombe State', phone: '+2348092345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Billiri', state: 'Gombe', lga: 'Billiri', address: 'Billiri, Gombe State', phone: '+2348093456789', hasEmergency: true, hasArtServices: true },

  // ── Taraba ──
  { name: 'Federal Medical Centre Jalingo', state: 'Taraba', lga: 'Jalingo', address: 'Jalingo, Taraba State', phone: '+2348092345678', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Specialist Hospital Jalingo', state: 'Taraba', lga: 'Jalingo', address: 'Jalingo, Taraba State', phone: '+2348093456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Wukari', state: 'Taraba', lga: 'Wukari', address: 'Wukari, Taraba State', phone: '+2348094567890', hasEmergency: true, hasArtServices: true },

  // ── Adamawa ──
  { name: 'Federal Medical Centre Yola', state: 'Adamawa', lga: 'Yola North', address: 'Yola, Adamawa State', phone: '+2348101234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Specialist Hospital Yola', state: 'Adamawa', lga: 'Yola South', address: 'Yola, Adamawa State', phone: '+2348102345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Mubi', state: 'Adamawa', lga: 'Mubi North', address: 'Mubi, Adamawa State', phone: '+2348103456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Numan', state: 'Adamawa', lga: 'Numan', address: 'Numan, Adamawa State', phone: '+2348104567890', hasEmergency: true, hasArtServices: true },

  // ── Bayelsa ──
  { name: 'Federal Medical Centre Yenagoa', state: 'Bayelsa', lga: 'Yenagoa', address: 'Yenagoa, Bayelsa State', phone: '+2348111234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'General Hospital Yenagoa', state: 'Bayelsa', lga: 'Yenagoa', address: 'Yenagoa, Bayelsa State', phone: '+2348112345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Sagbama', state: 'Bayelsa', lga: 'Sagbama', address: 'Sagbama, Bayelsa State', phone: '+2348113456789', hasEmergency: true, hasArtServices: true },

  // ── Katsina ──
  { name: 'Federal Medical Centre Katsina', state: 'Katsina', lga: 'Katsina', address: 'Katsina, Katsina State', phone: '+2348121234567', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Turai Yar\'Adua Maternity Hospital', state: 'Katsina', lga: 'Katsina', address: 'Katsina, Katsina State', phone: '+2348122345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Daura', state: 'Katsina', lga: 'Daura', address: 'Daura, Katsina State', phone: '+2348123456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Funtua', state: 'Katsina', lga: 'Funtua', address: 'Funtua, Katsina State', phone: '+2348124567890', hasEmergency: true, hasArtServices: true },

  // ── Ondo ──
  { name: 'University of Medical Sciences Teaching Hospital (UNIMEDTH)', state: 'Ondo', lga: 'Owo', address: 'Owo, Ondo State', phone: '+2348131234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Federal Medical Centre Owo', state: 'Ondo', lga: 'Owo', address: 'Owo, Ondo State', phone: '+2348132345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Akure', state: 'Ondo', lga: 'Akure South', address: 'Akure, Ondo State', phone: '+2348133456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ondo', state: 'Ondo', lga: 'Ondo West', address: 'Ondo Town, Ondo State', phone: '+2348134567890', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Okitipupa', state: 'Ondo', lga: 'Okitipupa', address: 'Okitipupa, Ondo State', phone: '+2348135678901', hasEmergency: true, hasArtServices: true },

  // ── Osun ──
  { name: 'Obafemi Awolowo University Teaching Hospital (OAUTH)', state: 'Osun', lga: 'Ife Central', address: 'Ile-Ife, Osun State', phone: '+2348141234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'LAUTECH Teaching Hospital', state: 'Osun', lga: 'Osogbo', address: 'Osogbo, Osun State', phone: '+2348142345678', hasEmergency: true, hasArtServices: true },
  { name: 'State Hospital Osogbo', state: 'Osun', lga: 'Osogbo', address: 'Osogbo, Osun State', phone: '+2348143456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ile-Ife', state: 'Osun', lga: 'Ife Central', address: 'Ile-Ife, Osun State', phone: '+2348144567890', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ilesa', state: 'Osun', lga: 'Ilesa East', address: 'Ilesa, Osun State', phone: '+2348145678901', hasEmergency: true, hasArtServices: true },

  // ── Jigawa ──
  { name: 'Rashid Shekoni Teaching Hospital', state: 'Jigawa', lga: 'Dutse', address: 'Dutse, Jigawa State', phone: '+2348151234567', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Hadejia', state: 'Jigawa', lga: 'Hadejia', address: 'Hadejia, Jigawa State', phone: '+2348152345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Gumel', state: 'Jigawa', lga: 'Gumel', address: 'Gumel, Jigawa State', phone: '+2348153456789', hasEmergency: true, hasArtServices: true },

  // ── Kebbi ──
  { name: 'Federal Medical Centre Birnin Kebbi', state: 'Kebbi', lga: 'Birnin Kebbi', address: 'Birnin Kebbi, Kebbi State', phone: '+2348161234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'General Hospital Argungu', state: 'Kebbi', lga: 'Argungu', address: 'Argungu, Kebbi State', phone: '+2348162345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Yauri', state: 'Kebbi', lga: 'Yauri', address: 'Yauri, Kebbi State', phone: '+2348163456789', hasEmergency: true, hasArtServices: true },

  // ── Yobe ──
  { name: 'Federal Medical Centre Nguru', state: 'Yobe', lga: 'Nguru', address: 'Nguru, Yobe State', phone: '+2348171234567', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'Yobe State Specialist Hospital', state: 'Yobe', lga: 'Damaturu', address: 'Damaturu, Yobe State', phone: '+2348172345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Potiskum', state: 'Yobe', lga: 'Potiskum', address: 'Potiskum, Yobe State', phone: '+2348173456789', hasEmergency: true, hasArtServices: true },

  // ── Zamfara ──
  { name: 'Federal Medical Centre Gusau', state: 'Zamfara', lga: 'Gusau', address: 'Gusau, Zamfara State', phone: '+2348181234567', hasEmergency: true, hasHivServices: true, hasArtServices: true },
  { name: 'General Hospital Talata Mafara', state: 'Zamfara', lga: 'Talata Mafara', address: 'Talata Mafara, Zamfara State', phone: '+2348182345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Anka', state: 'Zamfara', lga: 'Anka', address: 'Anka, Zamfara State', phone: '+2348183456789', hasEmergency: true, hasArtServices: true },

  // ── Ekiti ──
  { name: 'Ekiti State University Teaching Hospital (EKSUTH)', state: 'Ekiti', lga: 'Ado Ekiti', address: 'Ado Ekiti, Ekiti State', phone: '+2348191234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Federal Teaching Hospital Ido-Ekiti', state: 'Ekiti', lga: 'Ido Osi', address: 'Ido-Ekiti, Ekiti State', phone: '+2348192345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Ikere-Ekiti', state: 'Ekiti', lga: 'Ikere', address: 'Ikere-Ekiti, Ekiti State', phone: '+2348193456789', hasEmergency: true, hasArtServices: true },

  // ── Abia ──
  { name: 'Federal Medical Centre Umuahia', state: 'Abia', lga: 'Umuahia North', address: 'Umuahia, Abia State', phone: '+2348201234567', hasEmergency: true, hasHivServices: true, hasTbServices: true, hasArtServices: true },
  { name: 'Abia State University Teaching Hospital (ABSUTH)', state: 'Abia', lga: 'Aba North', address: 'Aba, Abia State', phone: '+2348202345678', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Aba', state: 'Abia', lga: 'Aba South', address: 'Aba, Abia State', phone: '+2348203456789', hasEmergency: true, hasArtServices: true },
  { name: 'General Hospital Arochukwu', state: 'Abia', lga: 'Arochukwu', address: 'Arochukwu, Abia State', phone: '+2348204567890', hasEmergency: true, hasArtServices: true },
];

module.exports = hospitals;
