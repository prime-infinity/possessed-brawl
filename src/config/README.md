# Spell Configuration

This directory contains configuration files for the Spell System.

## spellConfig.json

The `spellConfig.json` file defines spell costs, damage values, and counter rules for the game. This file is provided as a reference for tuning game balance.

### Structure

```json
{
  "spells": {
    "costs": { ... },
    "damage": { ... }
  },
  "counterTable": [ ... ]
}
```

### Spell Costs

Mana cost for each spell:

- **Shield**: 20 mana - Defensive spell, moderate cost
- **Lightning**: 30 mana - Strongest spell, highest cost
- **Fireball**: 15 mana - Basic attack, lowest cost
- **Frost**: 25 mana - Utility spell, high cost

### Spell Damage

Base damage for each spell:

- **Shield**: 0 damage - Defensive only
- **Lightning**: 25 damage - Highest damage
- **Fireball**: 20 damage - Moderate damage
- **Frost**: 15 damage - Lowest damage

### Counter Table

The counter table defines spell interactions:

1. **Shield blocks Fireball** - Fireball deals no damage when defender has active shield
2. **Lightning breaks Shield** - Lightning breaks through shield and deals full damage
3. **Fireball melts Frost** - Fireball counters Frost effects
4. **Frost slows Lightning caster** - Frost applies a slow effect to the opponent

## Tuning the Configuration

To adjust spell balance:

1. Modify the values in `spellConfig.json`
2. Use the SpellSystem's `importConfig()` method to load the configuration:

```typescript
import spellConfigData from './config/spellConfig.json';

const spellSystem = new SpellSystem();
spellSystem.importConfig(JSON.stringify(spellConfigData));
```

Alternatively, you can tune values programmatically:

```typescript
// Adjust individual costs
spellSystem.setCosts({ 
  [SpellType.SHIELD]: 25 
});

// Adjust individual damage
spellSystem.setDamage({ 
  [SpellType.LIGHTNING]: 30 
});

// Export current configuration
const config = spellSystem.exportConfig();
console.log(config);
```

## Balance Considerations

When tuning spell values, consider:

- **Mana Cost vs Damage**: Higher damage spells should cost more mana
- **Cast Frequency**: Lower cost spells will be used more often
- **Counter Relationships**: Some spells counter others (see counter table)
- **Shield Effectiveness**: Shield cost should balance with Fireball cost
- **Mana Regeneration Rate**: Currently 5 mana per second (see GameEngine config)

## Testing Balance Changes

After modifying spell values, run the test suite to ensure everything works:

```bash
npm test -- SpellSystem --run
```

This will run both unit tests and integration tests for the Spell System.
