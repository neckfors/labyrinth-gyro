// Legend:
// # = Wall
// . = Floor
// S = Start
// G = Goal
// P = Abyss Pit (jump over)
// ^ = Floor Spikes (jump over)
// - = Low Barrier (jump over)
// T = Timed Spike Trap (cycles open/closed)
// C = Checkpoint

export const LEVELS = [
  {
    name: 'The Outer Gate',
    hint: 'Tilt phone or use WASD / Arrows. Tap or press Space to jump over spikes.',
    grid: [
      '#######',
      '#S..#G#',
      '###.#.#',
      '#...#.#',
      '#.###.#',
      '#..^..#',
      '#.###.#',
      '#.....#',
      '#######'
    ]
  },
  {
    name: 'First Chasm',
    hint: 'Leap across dark chasms — your ball rises and grows larger in mid-air.',
    grid: [
      '#########',
      '#S..#..G#',
      '#.#.#.###',
      '#.#P..#.#',
      '#.###.#.#',
      '#...^...#',
      '###.###.#',
      '#...#...#',
      '#.P.#.###',
      '#.......#',
      '#########'
    ]
  },
  {
    name: 'Stone Hurdles',
    hint: 'Watch for low barriers and tighter turns.',
    grid: [
      '#########',
      '#S..#...#',
      '###.#.#.#',
      '#..-..#.#',
      '#.###.#.#',
      '#P..#P..#',
      '#.#.#.###',
      '#.#...^.#',
      '#.#####.#',
      '#...P...#',
      '###.###.#',
      '#G..#...#',
      '#########'
    ]
  },
  {
    name: 'Twin Trials',
    hint: 'Reach the glowing rune to set a checkpoint.',
    grid: [
      '###########',
      '#S..#.....#',
      '#.#.#.###.#',
      '#.#P..#...#',
      '#.###.#.###',
      '#..^..#..-#',
      '###.###.#.#',
      '#...C...#.#',
      '#.#####.#.#',
      '#.#...P.#.#',
      '#.#.###.#.#',
      '#...^...#G#',
      '###########'
    ]
  },
  {
    name: 'Clockwork Spikes',
    hint: 'Timed traps pulse before popping up — roll when retracted or jump over!',
    grid: [
      '###########',
      '#S..#....G#',
      '###.#.#####',
      '#..T..#...#',
      '#.###.#.#.#',
      '#.#P..#T#.#',
      '#.#.###.#.#',
      '#...C...#.#',
      '#####.###.#',
      '#...^.#...#',
      '#.#.#.#.###',
      '#.#P..#...#',
      '#.###.###.#',
      '#....-....#',
      '###########'
    ]
  },
  {
    name: 'The Gauntlet',
    hint: 'Double hazards require steady speed and clean jump timing.',
    grid: [
      '#############',
      '#S..#...#..G#',
      '#.#.#.#.#.###',
      '#.#^..#P..#.#',
      '#.###.###.#.#',
      '#..T..#...#.#',
      '###.#.#.###.#',
      '#...#C..#...#',
      '#.#####.#.###',
      '#.#...P.#T..#',
      '#.#.###.###.#',
      '#.#..-#...#.#',
      '#.###.###.#.#',
      '#...P...^...#',
      '#############'
    ]
  },
  {
    name: 'Sunken Citadel',
    hint: 'Navigate the deep halls — use checkpoints wisely.',
    grid: [
      '#############',
      '#S....#.....#',
      '#.###.#.###.#',
      '#.#P..#..T#.#',
      '#.#.###.#.#.#',
      '#...#...#.#.#',
      '###.#.###.#.#',
      '#..-#C..#P..#',
      '#.###.###.###',
      '#.#...^...#.#',
      '#.#.#####.#.#',
      '#T#.#...#.#.#',
      '#.#.#.#.#C#.#',
      '#...#P..#...#',
      '#####.###.###',
      '#G..^.....#.#',
      '#############'
    ]
  },
  {
    name: "Master's Labyrinth",
    hint: 'The final labyrinth. Master tilt control, rhythm, and mid-air leaps.',
    grid: [
      '###############',
      '#S..#.....#..G#',
      '#.#.#.###.#.###',
      '#.#P..#T..#...#',
      '#.###.#.###.#.#',
      '#..^..#...#P#.#',
      '###.#####.#.#.#',
      '#...#...C.#T..#',
      '#.###.#.###.###',
      '#.#..-#...#...#',
      '#.#.#####.#.#.#',
      '#P#.#...#.#P#.#',
      '#.#.#.#.#.###.#',
      '#...#T#.#C....#',
      '#####.#.#####.#',
      '#...^.#.....#.#',
      '#.#.#.#####.#.#',
      '#.#P....-.....#',
      '###############'
    ]
  }
];
