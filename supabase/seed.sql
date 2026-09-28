insert into public.career_tracks (slug, name, description, role_overview, difficulty, estimated_months, programming_requirements, tools) values
('embedded-systems', 'Embedded Systems', 'Firmware, microcontrollers, protocols and real hardware.', 'Build reliable software close to electronics hardware.', 'Moderate', 6, '["C", "C++"]', '["Git", "oscilloscope", "logic analyzer", "PlatformIO"]'),
('iot', 'IoT', 'Connected devices, sensors, edge systems and cloud telemetry.', 'Design and operate connected sensing and control systems.', 'Moderate', 6, '["C++", "Python"]', '["ESP32", "MQTT", "Git"]'),
('rf-engineering', 'RF Engineering', 'Radio-frequency circuits, measurements and wireless systems.', 'Design, analyze and validate systems operating at radio frequencies.', 'High foundation', 9, '["Python", "MATLAB"]', '["Smith chart", "VNA", "spectrum analyzer"]'),
('radar-engineering', 'Radar Engineering', 'Detection, ranging, Doppler and radar signal processing.', 'Work across electromagnetics, RF hardware and signal processing.', 'High foundation', 10, '["Python", "MATLAB"]', '["GNU Radio", "SDR", "simulation tools"]'),
('antenna-engineering', 'Antenna Engineering', 'Radiation, propagation and antenna design.', 'Design and validate antennas for wireless systems.', 'High foundation', 9, '["Python", "MATLAB"]', '["EM simulation", "VNA"]'),
('microwave-engineering', 'Microwave Engineering', 'Transmission lines, S-parameters and high-frequency circuits.', 'Analyze and design microwave components and systems.', 'High foundation', 9, '["Python"]', '["VNA", "RF simulation"]'),
('vlsi', 'VLSI', 'Digital design, verification and semiconductor workflows.', 'Design or verify integrated digital systems.', 'High foundation', 8, '["Verilog", "Python"]', '["EDA tools", "Git"]'),
('semiconductor-engineering', 'Semiconductor Engineering', 'Semiconductor devices, fabrication, characterization and products.', 'Develop, characterize and support semiconductor devices and processes.', 'High foundation', 9, '["Python"]', '["SPICE", "device characterization tools"]'),
('signal-processing', 'Signal Processing', 'Algorithms for signals, communications and sensing.', 'Model, filter and extract information from signals.', 'High foundation', 8, '["Python", "MATLAB"]', '["NumPy", "SciPy", "GNU Radio"]'),
('telecommunication', 'Telecommunication', 'Communication networks and transmission systems.', 'Plan and operate communication infrastructure.', 'Moderate', 7, '["Python"]', '["network simulators", "spectrum tools"]'),
('wireless-communication', 'Wireless Communication', 'Modulation, channels, link budgets and modern radio systems.', 'Analyze and build wireless communication links.', 'High foundation', 8, '["Python", "MATLAB"]', '["SDR", "GNU Radio"]'),
('networking', 'Networking', 'Computer and communication network fundamentals.', 'Build and operate reliable networks.', 'Moderate', 5, '["Python"]', '["Wireshark", "Linux"]'),
('industrial-automation', 'Industrial Automation', 'Control systems, production automation and industrial integration.', 'Automate industrial processes safely.', 'Moderate', 6, '["Ladder logic", "Structured Text"]', '["PLC IDE", "SCADA"]'),
('plc', 'PLC', 'Programmable logic controllers, ladder logic and safe machine control.', 'Program and commission dependable industrial control systems.', 'Moderate', 5, '["Ladder logic", "Structured Text"]', '["PLC IDE", "HMI", "SCADA"]'),
('robotics', 'Robotics', 'Sensors, control, mechanics and autonomous systems.', 'Build systems that sense, decide and act.', 'Moderate', 8, '["C++", "Python"]', '["ROS", "Git"]'),
('core-electronics', 'Core Electronics', 'Analog, digital, power and electronic system foundations.', 'Work on electronic circuits, products and validation.', 'Moderate', 7, '["C"]', '["oscilloscope", "multimeter", "SPICE"]'),
('software-it', 'Software / IT', 'Software engineering paths for electronics students.', 'Build dependable software and systems.', 'Moderate', 6, '["Java or C++", "JavaScript or Python"]', '["Git", "Linux", "databases"]'),
('ai-electronics', 'AI + Electronics', 'Edge AI, intelligent sensors and embedded machine learning.', 'Deploy intelligent models into electronic products.', 'High foundation', 9, '["Python", "C++"]', '["PyTorch", "ONNX", "edge runtimes"]')
on conflict (slug) do nothing;

insert into public.skills (slug, name, category, description) values
('engineering-mathematics', 'Engineering Mathematics', 'Foundation', 'Linear algebra, calculus, probability and complex variables.'),
('network-theory', 'Network Theory', 'Foundation', 'Circuit analysis, transients, network theorems and frequency response.'),
('signals-systems', 'Signals & Systems', 'Foundation', 'LTI systems, convolution, Fourier and Laplace transforms.'),
('communication-systems', 'Communication Systems', 'Core', 'Analog and digital modulation, noise and channels.'),
('electromagnetic-theory', 'Electromagnetic Theory', 'Core', 'Fields, waves, Maxwell equations and propagation.'),
('transmission-lines', 'Transmission Lines', 'RF', 'Impedance, reflection, matching and Smith chart.'),
('antenna-fundamentals', 'Antenna Fundamentals', 'RF', 'Radiation, patterns, gain, polarization and arrays.'),
('rf-microwave', 'RF / Microwave Fundamentals', 'RF', 'S-parameters, RF blocks and microwave systems.'),
('radar-fundamentals', 'Radar Fundamentals', 'RF', 'Radar equation, ranging, Doppler and system blocks.'),
('radar-signal-processing', 'Radar Signal Processing', 'RF', 'Detection, FFT processing, filtering and estimation.'),
('embedded-c', 'Embedded C', 'Embedded', 'C for hardware registers, interrupts and constrained systems.'),
('microcontrollers', 'Microcontrollers', 'Embedded', 'Architecture, peripherals, timers and interfaces.'),
('esp32', 'ESP32 Basics', 'Embedded', 'ESP32 development, connectivity and common peripherals.'),
('mqtt', 'MQTT', 'IoT', 'Publish/subscribe messaging for connected devices.')
on conflict (slug) do nothing;

insert into public.skill_dependencies (skill_id, prerequisite_skill_id, minimum_progress)
select skill.id, prerequisite.id, 60
from (values
  ('signals-systems', 'engineering-mathematics'),
  ('communication-systems', 'signals-systems'),
  ('electromagnetic-theory', 'engineering-mathematics'),
  ('transmission-lines', 'electromagnetic-theory'),
  ('antenna-fundamentals', 'transmission-lines'),
  ('rf-microwave', 'transmission-lines'),
  ('radar-fundamentals', 'communication-systems'),
  ('radar-fundamentals', 'rf-microwave'),
  ('radar-signal-processing', 'radar-fundamentals'),
  ('microcontrollers', 'embedded-c'),
  ('esp32', 'microcontrollers'),
  ('mqtt', 'esp32')
) as dependency(skill_slug, prerequisite_slug)
join public.skills skill on skill.slug = dependency.skill_slug
join public.skills prerequisite on prerequisite.slug = dependency.prerequisite_slug
on conflict (skill_id, prerequisite_skill_id) do nothing;

insert into public.project_templates (
  slug, title, career_track_id, problem_statement, career_relevance, difficulty,
  implementation_mode, estimated_minutes, guidance, template_source, revision,
  compatibility_notes, review_status, reviewed_at
)
select seed.slug, seed.title, track.id, seed.problem_statement, seed.career_relevance,
  seed.difficulty, seed.implementation_mode, seed.estimated_minutes, seed.guidance::jsonb,
  'Placement Prep internal reviewed starter-template catalog', seed.revision,
  seed.compatibility_notes, 'reviewed', '2026-09-21'::timestamptz
from (values
  ('arduino-distance-scanner','Arduino Distance Scanner','embedded-systems','Measure distance at several servo angles and report the nearest obstacle.','Sensor integration, actuator control, power planning and repeatable embedded testing.','starter','hardware',360,'{"safe_scope":"Exact wiring requires confirmed module and supply models."}','1.1','Arduino Uno-class 5 V board, HC-SR04-class sensor, SG90-class servo and common I2C LCD backpack.'),
  ('doppler-radar-simulator','Doppler Radar Signal Simulator','radar-engineering','Estimate Doppler frequency and velocity from a controlled synthetic echo.','Signals, FFT analysis, radar assumptions and honest error reporting.','intermediate','simulation',300,'{"safe_scope":"Simulation only; no RF hardware result is implied."}','1.0','Python simulation; SDR capture requires a separate review.'),
  ('clean-noisy-signal-lab','Clean vs Noisy Signal Lab','signal-processing','Compare a known signal, controlled noise and simple filters.','Filtering trade-offs, metrics and reproducible signal analysis.','starter','simulation',180,'{"safe_scope":"Simulation only."}','1.0','Python or equivalent numerical simulation.'),
  ('verified-button-fsm','Verified Button-Controlled State Machine','vlsi','Design a small state machine and verify every specified transition.','RTL design, testbenches, waveforms and specification-driven debugging.','intermediate','simulation',240,'{"safe_scope":"RTL simulation only; FPGA constraints require a separate review."}','1.0','Verilog/SystemVerilog simulator.'),
  ('tank-level-control','Tank-Level Control Sequence','industrial-automation','Simulate a level controller with interlocks, alarms and a safe default.','Sequence control, fault handling and commissioning logic.','starter','simulation',210,'{"safe_scope":"No mains or physical pump wiring is included."}','1.0','PLC or ladder-logic simulation only.')
) as seed(slug,title,track_slug,problem_statement,career_relevance,difficulty,implementation_mode,estimated_minutes,guidance,revision,compatibility_notes)
join public.career_tracks track on track.slug = seed.track_slug
on conflict (slug) do nothing;

insert into public.project_template_components (project_template_id, name, aliases, quantity, requirement, category, model_notes, power_notes, position)
select template.id, item.name, item.aliases::jsonb, item.quantity, item.requirement, item.category::public.equipment_category, item.model_notes, item.power_notes, item.position
from (values
  ('arduino-distance-scanner','Arduino Uno','["arduino","uno"]',1,'required','component','Confirm the exact board model.',null,1),
  ('arduino-distance-scanner','HC-SR04 ultrasonic sensor','["hc-sr04","ultrasonic"]',1,'required','component','Confirm the sensor model.',null,2),
  ('arduino-distance-scanner','SG90 micro servo','["sg90","servo"]',1,'required','component','Confirm the servo model.','Use a suitable regulated supply; do not assume the board regulator can supply stall current.',3),
  ('arduino-distance-scanner','16x2 I2C LCD','["lcd","16x2","i2c lcd"]',1,'required','component','Confirm the backpack/controller and address.',null,4),
  ('arduino-distance-scanner','5 V regulated supply','["5v supply","power supply"]',1,'required','power','Confirm current capacity and polarity.','Capacity must cover startup current with margin.',5),
  ('doppler-radar-simulator','Computer','["computer","laptop","pc"]',1,'required','tool',null,null,1),
  ('doppler-radar-simulator','Python environment','["python","jupyter","colab"]',1,'required','software',null,null,2),
  ('clean-noisy-signal-lab','Python environment','["python","jupyter","colab"]',1,'required','software',null,null,1),
  ('verified-button-fsm','HDL simulator','["iverilog","verilator","modelsim","eda playground"]',1,'required','software',null,null,1),
  ('tank-level-control','PLC simulator','["plc simulator","codesys","openplc"]',1,'required','software',null,null,1)
) as item(template_slug,name,aliases,quantity,requirement,category,model_notes,power_notes,position)
join public.project_templates template on template.slug = item.template_slug
on conflict (project_template_id, position) do nothing;

insert into public.role_exploration_activities (
  slug, career_track_id, title, represents, estimated_minutes, prerequisites,
  required_tools, instructions, expected_output, beginner_support, reflection_questions
)
select seed.slug, track.id, seed.title, seed.represents, seed.estimated_minutes,
  seed.prerequisites::jsonb, seed.required_tools::jsonb, seed.instructions::jsonb,
  seed.expected_output, seed.beginner_support::jsonb,
  '["Did you enjoy this?","Which part interested you?","Which part was difficult?","Would you like another activity in this area?"]'::jsonb
from (values
  ('rf-frequency-wavelength','rf-engineering','Frequency, wavelength and antenna size','Connect frequency choices to physical dimensions and practical RF constraints.',25,'["Basic algebra"]','["Calculator or spreadsheet"]','["Choose three frequencies","Calculate wavelength","Estimate quarter-wave length","Record one practical trade-off"]','A table of frequency, wavelength, quarter-wave length and one observation.','["Use 3 × 10^8 m/s for a first approximation","Keep units visible"]'),
  ('embedded-state-machine','embedded-systems','Button-controlled state machine','Convert behavior into states, transitions and testable edge cases.',35,'["Basic logic","Basic C or pseudocode"]','["Paper, flowchart tool or C simulator"]','["Define three states","Write transitions","Add reset","Test repeated input"]','A state diagram or trace table.','["Start with a table","One input should cause one defined transition"]'),
  ('signal-noise-comparison','signal-processing','Compare clean and noisy signals','Inspect data, define a metric and evaluate a filtering trade-off.',30,'["Sine-wave basics"]','["Python notebook, spreadsheet or graphing tool"]','["Create a reference","Add controlled noise","Apply one filter","Compare with a stated metric"]','Three plots or tables and an honest comparison.','["A spreadsheet is acceptable","Define how improvement is measured"]'),
  ('vlsi-logic-test','vlsi','Design and test a simple logic circuit','Turn a requirement into logic and verify every input combination.',30,'["Truth tables"]','["Paper or logic simulator"]','["Write a requirement","Create a truth table","Derive logic","Test every row"]','A requirement, truth table, expression and complete test record.','["Use two inputs first","A truth table is stronger than a screenshot alone"]'),
  ('automation-tank-sequence','industrial-automation','Tank-level control sequence','Define sequences, interlocks and safe behavior before equipment commissioning.',35,'["Boolean logic"]','["Paper, spreadsheet or PLC simulator"]','["Define inputs","Write pump sequence","Add sensor fault","Run a trace"]','An input/output table and normal/fault trace.','["Use simulation only","Write the safe default first"]')
) as seed(slug,track_slug,title,represents,estimated_minutes,prerequisites,required_tools,instructions,expected_output,beginner_support)
join public.career_tracks track on track.slug = seed.track_slug
on conflict (slug) do nothing;
