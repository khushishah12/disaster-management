-- Seed Indian states and union territories
insert into public.states (name, code) values
  ('Andhra Pradesh', 'AP'),
  ('Arunachal Pradesh', 'AR'),
  ('Assam', 'AS'),
  ('Bihar', 'BR'),
  ('Chhattisgarh', 'CG'),
  ('Goa', 'GA'),
  ('Gujarat', 'GJ'),
  ('Haryana', 'HR'),
  ('Himachal Pradesh', 'HP'),
  ('Jharkhand', 'JH'),
  ('Karnataka', 'KA'),
  ('Kerala', 'KL'),
  ('Madhya Pradesh', 'MP'),
  ('Maharashtra', 'MH'),
  ('Manipur', 'MN'),
  ('Meghalaya', 'ML'),
  ('Mizoram', 'MZ'),
  ('Nagaland', 'NL'),
  ('Odisha', 'OD'),
  ('Punjab', 'PB'),
  ('Rajasthan', 'RJ'),
  ('Sikkim', 'SK'),
  ('Tamil Nadu', 'TN'),
  ('Telangana', 'TG'),
  ('Tripura', 'TR'),
  ('Uttar Pradesh', 'UP'),
  ('Uttarakhand', 'UK'),
  ('West Bengal', 'WB'),
  ('Andaman and Nicobar Islands', 'AN'),
  ('Chandigarh', 'CH'),
  ('Dadra and Nagar Haveli and Daman and Diu', 'DD'),
  ('Delhi', 'DL'),
  ('Jammu and Kashmir', 'JK'),
  ('Ladakh', 'LA'),
  ('Lakshadweep', 'LD'),
  ('Puducherry', 'PY')
on conflict (name) do nothing;

-- Seed major cities for each state (top 5-10 cities per state)
do $$
declare
  s record;
begin
  for s in (select id, name from public.states) loop
    case s.name
      when 'Andhra Pradesh' then
        insert into public.cities (name, state_id) values ('Visakhapatnam', s.id), ('Vijayawada', s.id), ('Guntur', s.id), ('Nellore', s.id), ('Kurnool', s.id), ('Rajahmundry', s.id), ('Tirupati', s.id), ('Kakinada', s.id), ('Anantapur', s.id), ('Eluru', s.id) on conflict (name, state_id) do nothing;
      when 'Arunachal Pradesh' then
        insert into public.cities (name, state_id) values ('Itanagar', s.id), ('Naharlagun', s.id), ('Pasighat', s.id), ('Tawang', s.id), ('Ziro', s.id), ('Bomdila', s.id) on conflict (name, state_id) do nothing;
      when 'Assam' then
        insert into public.cities (name, state_id) values ('Guwahati', s.id), ('Silchar', s.id), ('Dibrugarh', s.id), ('Jorhat', s.id), ('Nagaon', s.id), ('Tinsukia', s.id), ('Tezpur', s.id), ('Bongaigaon', s.id) on conflict (name, state_id) do nothing;
      when 'Bihar' then
        insert into public.cities (name, state_id) values ('Patna', s.id), ('Gaya', s.id), ('Bhagalpur', s.id), ('Muzaffarpur', s.id), ('Purnia', s.id), ('Darbhanga', s.id), ('Bihar Sharif', s.id), ('Arrah', s.id), ('Begusarai', s.id), ('Katihar', s.id) on conflict (name, state_id) do nothing;
      when 'Chhattisgarh' then
        insert into public.cities (name, state_id) values ('Raipur', s.id), ('Bhilai', s.id), ('Bilaspur', s.id), ('Korba', s.id), ('Rajnandgaon', s.id), ('Raigarh', s.id), ('Jagdalpur', s.id), ('Durg', s.id) on conflict (name, state_id) do nothing;
      when 'Goa' then
        insert into public.cities (name, state_id) values ('Panaji', s.id), ('Margao', s.id), ('Vasco da Gama', s.id), ('Mapusa', s.id), ('Ponda', s.id), ('Bicholim', s.id) on conflict (name, state_id) do nothing;
      when 'Gujarat' then
        insert into public.cities (name, state_id) values ('Ahmedabad', s.id), ('Surat', s.id), ('Vadodara', s.id), ('Rajkot', s.id), ('Bhavnagar', s.id), ('Jamnagar', s.id), ('Junagadh', s.id), ('Gandhinagar', s.id), ('Anand', s.id), ('Nadiad', s.id), ('Morbi', s.id), ('Mehsana', s.id), ('Bharuch', s.id), ('Navsari', s.id), ('Bhuj', s.id), ('Surendranagar', s.id), ('Gandhidham', s.id), ('Patan', s.id), ('Palanpur', s.id), ('Valsad', s.id) on conflict (name, state_id) do nothing;
      when 'Haryana' then
        insert into public.cities (name, state_id) values ('Chandigarh', s.id), ('Faridabad', s.id), ('Gurugram', s.id), ('Panipat', s.id), ('Ambala', s.id), ('Karnal', s.id), ('Sonipat', s.id), ('Rohtak', s.id), ('Hisar', s.id), ('Panchkula', s.id) on conflict (name, state_id) do nothing;
      when 'Himachal Pradesh' then
        insert into public.cities (name, state_id) values ('Shimla', s.id), ('Dharamshala', s.id), ('Mandi', s.id), ('Solan', s.id), ('Kullu', s.id), ('Hamirpur', s.id), ('Bilaspur', s.id), ('Palampur', s.id) on conflict (name, state_id) do nothing;
      when 'Jharkhand' then
        insert into public.cities (name, state_id) values ('Ranchi', s.id), ('Jamshedpur', s.id), ('Dhanbad', s.id), ('Bokaro', s.id), ('Deoghar', s.id), ('Hazaribagh', s.id), ('Giridih', s.id), ('Ramgarh', s.id) on conflict (name, state_id) do nothing;
      when 'Karnataka' then
        insert into public.cities (name, state_id) values ('Bengaluru', s.id), ('Mysuru', s.id), ('Hubli', s.id), ('Mangaluru', s.id), ('Belagavi', s.id), ('Davangere', s.id), ('Bellary', s.id), ('Tumkur', s.id), ('Shivamogga', s.id), ('Raichur', s.id), ('Bidar', s.id), ('Hospet', s.id), ('Gulbarga', s.id), ('Udupi', s.id) on conflict (name, state_id) do nothing;
      when 'Kerala' then
        insert into public.cities (name, state_id) values ('Thiruvananthapuram', s.id), ('Kochi', s.id), ('Kozhikode', s.id), ('Thrissur', s.id), ('Kollam', s.id), ('Alappuzha', s.id), ('Kannur', s.id), ('Kottayam', s.id), ('Palakkad', s.id), ('Malappuram', s.id) on conflict (name, state_id) do nothing;
      when 'Madhya Pradesh' then
        insert into public.cities (name, state_id) values ('Bhopal', s.id), ('Indore', s.id), ('Gwalior', s.id), ('Jabalpur', s.id), ('Ujjain', s.id), ('Sagar', s.id), ('Dewas', s.id), ('Satna', s.id), ('Ratlam', s.id), ('Rewa', s.id), ('Murwara', s.id), ('Singrauli', s.id), ('Burhanpur', s.id) on conflict (name, state_id) do nothing;
      when 'Maharashtra' then
        insert into public.cities (name, state_id) values ('Mumbai', s.id), ('Pune', s.id), ('Nagpur', s.id), ('Thane', s.id), ('Nashik', s.id), ('Aurangabad', s.id), ('Solapur', s.id), ('Kolhapur', s.id), ('Amravati', s.id), ('Navi Mumbai', s.id), ('Sangli', s.id), ('Malegaon', s.id), ('Jalgaon', s.id), ('Akola', s.id), ('Latur', s.id), ('Ahmednagar', s.id), ('Dhule', s.id), ('Chandrapur', s.id), ('Parbhani', s.id), ('Ichalkaranji', s.id) on conflict (name, state_id) do nothing;
      when 'Manipur' then
        insert into public.cities (name, state_id) values ('Imphal', s.id), ('Bishnupur', s.id), ('Churachandpur', s.id), ('Thoubal', s.id) on conflict (name, state_id) do nothing;
      when 'Meghalaya' then
        insert into public.cities (name, state_id) values ('Shillong', s.id), ('Tura', s.id), ('Nongstoin', s.id), ('Jowai', s.id) on conflict (name, state_id) do nothing;
      when 'Mizoram' then
        insert into public.cities (name, state_id) values ('Aizawl', s.id), ('Lunglei', s.id), ('Champhai', s.id), ('Serchhip', s.id) on conflict (name, state_id) do nothing;
      when 'Nagaland' then
        insert into public.cities (name, state_id) values ('Kohima', s.id), ('Dimapur', s.id), ('Mokokchung', s.id), ('Tuensang', s.id), ('Wokha', s.id) on conflict (name, state_id) do nothing;
      when 'Odisha' then
        insert into public.cities (name, state_id) values ('Bhubaneswar', s.id), ('Cuttack', s.id), ('Rourkela', s.id), ('Berhampur', s.id), ('Sambalpur', s.id), ('Puri', s.id), ('Balasore', s.id), ('Bhadrak', s.id), ('Baripada', s.id), ('Jharsuguda', s.id) on conflict (name, state_id) do nothing;
      when 'Punjab' then
        insert into public.cities (name, state_id) values ('Ludhiana', s.id), ('Amritsar', s.id), ('Jalandhar', s.id), ('Patiala', s.id), ('Bathinda', s.id), ('Mohali', s.id), ('Hoshiarpur', s.id), ('Batala', s.id), ('Pathankot', s.id), ('Moga', s.id) on conflict (name, state_id) do nothing;
      when 'Rajasthan' then
        insert into public.cities (name, state_id) values ('Jaipur', s.id), ('Jodhpur', s.id), ('Udaipur', s.id), ('Kota', s.id), ('Bikaner', s.id), ('Ajmer', s.id), ('Bhilwara', s.id), ('Alwar', s.id), ('Sikar', s.id), ('Pali', s.id), ('Sri Ganganagar', s.id), ('Tonk', s.id), ('Kishangarh', s.id) on conflict (name, state_id) do nothing;
      when 'Sikkim' then
        insert into public.cities (name, state_id) values ('Gangtok', s.id), ('Namchi', s.id), ('Mangan', s.id), ('Gyalshing', s.id) on conflict (name, state_id) do nothing;
      when 'Tamil Nadu' then
        insert into public.cities (name, state_id) values ('Chennai', s.id), ('Coimbatore', s.id), ('Madurai', s.id), ('Tiruchirappalli', s.id), ('Salem', s.id), ('Tirunelveli', s.id), ('Tiruppur', s.id), ('Erode', s.id), ('Vellore', s.id), ('Thoothukkudi', s.id), ('Dindigul', s.id), ('Thanjavur', s.id), ('Ranipet', s.id), ('Sivakasi', s.id), ('Karur', s.id), ('Nagercoil', s.id), ('Kanchipuram', s.id) on conflict (name, state_id) do nothing;
      when 'Telangana' then
        insert into public.cities (name, state_id) values ('Hyderabad', s.id), ('Warangal', s.id), ('Nizamabad', s.id), ('Karimnagar', s.id), ('Khammam', s.id), ('Ramagundam', s.id), ('Mahbubnagar', s.id), ('Nalgonda', s.id), ('Adilabad', s.id), ('Suryapet', s.id) on conflict (name, state_id) do nothing;
      when 'Tripura' then
        insert into public.cities (name, state_id) values ('Agartala', s.id), ('Udaipur', s.id), ('Dharmanagar', s.id), ('Kailashahar', s.id) on conflict (name, state_id) do nothing;
      when 'Uttar Pradesh' then
        insert into public.cities (name, state_id) values ('Lucknow', s.id), ('Kanpur', s.id), ('Agra', s.id), ('Varanasi', s.id), ('Meerut', s.id), ('Prayagraj', s.id), ('Ghaziabad', s.id), ('Noida', s.id), ('Bareilly', s.id), ('Aligarh', s.id), ('Moradabad', s.id), ('Gorakhpur', s.id), ('Saharanpur', s.id), ('Jhansi', s.id), ('Firozabad', s.id), ('Mathura', s.id), ('Muzaffarnagar', s.id), ('Shahjahanpur', s.id), ('Rampur', s.id), ('Ayodhya', s.id) on conflict (name, state_id) do nothing;
      when 'Uttarakhand' then
        insert into public.cities (name, state_id) values ('Dehradun', s.id), ('Haridwar', s.id), ('Rishikesh', s.id), ('Haldwani', s.id), ('Roorkee', s.id), ('Rudrapur', s.id), ('Nainital', s.id), ('Mussoorie', s.id) on conflict (name, state_id) do nothing;
      when 'West Bengal' then
        insert into public.cities (name, state_id) values ('Kolkata', s.id), ('Howrah', s.id), ('Durgapur', s.id), ('Asansol', s.id), ('Siliguri', s.id), ('Bardhaman', s.id), ('Malda', s.id), ('Kharagpur', s.id), ('Jalpaiguri', s.id), ('Haldia', s.id), ('Krishnanagar', s.id), ('Darjeeling', s.id), ('Balurghat', s.id), ('Basirhat', s.id) on conflict (name, state_id) do nothing;
      when 'Andaman and Nicobar Islands' then
        insert into public.cities (name, state_id) values ('Port Blair', s.id) on conflict (name, state_id) do nothing;
      when 'Chandigarh' then
        insert into public.cities (name, state_id) values ('Chandigarh', s.id) on conflict (name, state_id) do nothing;
      when 'Delhi' then
        insert into public.cities (name, state_id) values ('New Delhi', s.id), ('Dwarka', s.id), ('Rohini', s.id), ('Saket', s.id), ('Karol Bagh', s.id), ('Connaught Place', s.id), ('Hauz Khas', s.id), ('Lajpat Nagar', s.id) on conflict (name, state_id) do nothing;
      when 'Jammu and Kashmir' then
        insert into public.cities (name, state_id) values ('Srinagar', s.id), ('Jammu', s.id), ('Anantnag', s.id), ('Baramulla', s.id), ('Sopore', s.id), ('Kathua', s.id), ('Udhampur', s.id) on conflict (name, state_id) do nothing;
      when 'Ladakh' then
        insert into public.cities (name, state_id) values ('Leh', s.id), ('Kargil', s.id) on conflict (name, state_id) do nothing;
      when 'Lakshadweep' then
        insert into public.cities (name, state_id) values ('Kavaratti', s.id) on conflict (name, state_id) do nothing;
      when 'Puducherry' then
        insert into public.cities (name, state_id) values ('Puducherry', s.id), ('Karaikal', s.id) on conflict (name, state_id) do nothing;
      else
        null;
    end case;
  end loop;
end $$;
