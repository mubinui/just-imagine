# STEM simulation library — design

Date: 2026-10-18. Status: product owner's requirements recorded; implementation follows the student/teacher/admin audit fixes.

## Intent

Teachers need ready-made, high-quality simulations they can drop into a lesson in a minute, change the parameters of, and assign as a graded task, plus the ability to describe a new one and have it generated. Today `packages/stem-sims` has five models (motion graphs, Newton's cart, Ohm's law, linear graph, unit circle) and a chemistry bench. The product owner asked for broad, very high-quality coverage of physics (vectors, force, energy, kinematics, gravity and more), chemistry (colour change, pH change, flame tests and more) and maths (calculus, probability, trigonometry, graphs and more), with changeable parameters, easy for teachers, and with teacher generation.

## Goals

- A preset library across the three subjects, each preset a real model with adjustable parameters, live readouts and graphs, and gradable tasks.
- Visual quality comparable to the best interactive science simulations: smooth 60 fps motion on a laptop, usable on a tablet, vector-drawn apparatus, labelled axes and units, clear colour coding, legible in English and Bangla.
- A teacher can find a simulation, preview it, set starting values, choose which values students may change, attach a task, and add it to a lesson in under a minute.
- A teacher can describe what they want ("a projectile launched from a cliff, students find the angle for maximum range") and get a configured simulation and task from the library, ready to review.

## Non-goals

- Executing generated code. Generation chooses and configures library models; it never writes a simulation.
- Free-form 3D. Two-dimensional, diagrammatic clarity is the aim.

## Anti-goals

- A simulation whose numbers are wrong, whose units are missing, or whose grading disagrees with what the student sees.
- Janky or stuttering motion, controls that lag, or text that overlaps on a tablet.
- A generated configuration that silently differs from the teacher's request.

## The model contract (existing, kept)

Each simulation is a `SimModel` (`packages/stem-sims/src/types.ts`): a strict Zod parameter schema, `solve(params)` for end or steady values, `at(params, t)` for animation, and named `predicates` for grading. The server grades from submitted parameters alone and recomputes every reading; a client-reported reading is never trusted. Every new preset follows this contract and ships with unit tests of its physics or mathematics against known values.

## Presets

Each preset lists its parameters (all adjustable, with ranges and units), what the student sees, and the predicates a task can use.

### Physics

| Preset | Parameters | Shows | Predicates |
| --- | --- | --- | --- |
| Vector addition | two vectors: magnitude, angle | tip-to-tail and parallelogram, components, resultant magnitude and angle | resultant magnitude/angle within tolerance |
| Projectile motion | launch speed, angle, height, gravity, air resistance on/off | trajectory with time dots, velocity vectors, range, apex, flight time | range/apex/time within tolerance, hits a target |
| Forces on an incline | mass, angle, friction coefficients | free-body diagram, net force, acceleration, sliding or static | net force or acceleration within tolerance, slides or holds |
| Energy and the pendulum | length, mass, release angle, gravity, damping | swinging pendulum, kinetic/potential/thermal energy bars | period within tolerance, energy at a point |
| Kinematics graphs (existing motion graphs, upgraded) | initial position, velocity, acceleration | moving object, position/velocity/acceleration graphs in sync | value at time t |
| Gravity and orbits | central mass, orbit radius, launch speed | orbit path, speed, escape or capture, Kepler period | orbit closes, period within tolerance |
| Spring and simple harmonic motion | mass, spring constant, amplitude, damping | oscillating mass, displacement graph, energy | period/frequency within tolerance |
| Collisions and momentum | two masses, velocities, elasticity | before/after, momentum and kinetic energy totals | final velocity, momentum conserved |
| Newton's cart (existing) and Ohm's law (existing) | as today | upgraded visuals | as today |

### Chemistry

| Preset | Parameters | Shows | Predicates |
| --- | --- | --- | --- |
| pH and indicators | acid or base, concentration, indicator | beaker colour from the indicator's real transition range, pH meter, scale | pH within tolerance, indicator colour |
| Titration | acid/base pair, concentrations, volume added | burette, flask colour change at the end point, titration curve | end-point volume within tolerance |
| Flame test | metal ion (Li, Na, K, Ca, Cu, Sr, Ba) | flame colour and its emission lines on a spectrum | identifies the ion |
| Reaction rate | temperature, concentration, catalyst, particle size | particle collisions, product over time | rate increases with a chosen factor |
| States of matter and gas laws | temperature, pressure, volume, amount | particle motion, PV = nRT readouts | value within tolerance |
| Chemistry bench (existing) | as today | upgraded visuals | as today |

### Mathematics

| Preset | Parameters | Shows | Predicates |
| --- | --- | --- | --- |
| Function grapher | family (linear, quadratic, cubic, sine, exponential, logarithm), coefficients | graph with intercepts, turning points, transformations | intercept/vertex/value within tolerance |
| Derivative as slope | function, point x | tangent line, slope readout, derivative graph | slope at x within tolerance |
| Area under a curve | function, interval, rectangles n, left/right/midpoint | Riemann rectangles converging on the integral | estimate within tolerance of the integral |
| Probability experiments | coin/dice/spinner, trials, bias | animated trials, frequency histogram converging on the theoretical distribution | relative frequency within tolerance |
| Trigonometry: unit circle and waves (existing unit circle, extended) | angle, amplitude, frequency, phase | unit circle tracing sine and cosine waves | value at angle within tolerance |
| Linear graph (existing) | as today | upgraded visuals | as today |

## Teacher experience

1. **Library**: a "Simulations" tab in the lesson editor shows the presets by subject as large preview cards (a live miniature, name, concepts, class level).
2. **Configure**: opening a preset shows it full size with every parameter as a labelled slider or choice. The teacher sets starting values and ticks which parameters students may change (the rest are locked), which uses the existing `LockedSimItem` structure.
3. **Task**: an optional task picks a predicate with its arguments in plain words ("the projectile lands within 1 m of 25 m").
4. **Add to lesson**: the configured simulation and task are stored in the lesson like today's sim items, in both languages.
5. **Generate**: "Describe a simulation" sends the teacher's words to `gemini-4-argon`, which returns a structured choice of preset, parameters, locked keys, task and bilingual instructions. The result is validated against the preset's schemas and shown in the configure view for the teacher to review and accept; nothing is added without the teacher's confirmation.

## Quality bar

- Animation runs on `requestAnimationFrame` with fixed physics steps; motion is smooth at 60 fps on a laptop and 30 fps minimum on a tablet.
- Every number has a unit; graphs have labelled axes and ticks; colours follow the app's palette with consistent meaning (velocity, force, energy).
- Sliders are keyboard accessible, show their value, and have a numeric entry; changes update the picture within one frame.
- Bangla labels and numerals throughout.
- Each preset has unit tests of its model against textbook values, and a browser test that drives its controls.

## Phases

1. Upgrade the five existing models' visuals and add the shared presentation components (slider panel, graph, readout, vector arrow).
2. Physics presets.
3. Chemistry presets.
4. Mathematics presets.
5. Teacher library, configure view and task editor.
6. Teacher generation.
