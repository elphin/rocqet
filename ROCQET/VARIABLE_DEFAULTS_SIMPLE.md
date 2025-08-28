# 🎯 Variable Defaults - Simpele Implementatie

## ✅ Nieuwe Syntax

Variabelen kunnen nu default values hebben met deze simpele syntax:

```
{{variable_name}}              // Zonder default
{{variable_name:default_value}} // Met default value
```

## 📝 Voorbeelden

### Customer Service Template
```
Dear {{customer_name:Customer}},

Thank you for contacting us about {{issue:your inquiry}}.
We'll respond within {{response_time:24 hours}}.

Best regards,
{{agent_name:Support Team}}
```

### Code Generation
```
Generate a {{language:JavaScript}} function that {{action:sorts an array}}.
The function should be {{style:clean and readable}}.
```

### Email Template
```
Subject: {{subject:Important Update}}

Hi {{recipient:there}},

{{greeting:Hope you're doing well!}}

{{main_content:Your content here...}}

Thanks,
{{sender:Your Team}}
```

## 🎨 Hoe het werkt

1. **In de Prompt Editor**: 
   - Schrijf gewoon `{{variable:default}}`
   - Geen extra UI nodig!

2. **In de Playground**:
   - Velden worden automatisch gevuld met defaults
   - Als geen waarde ingevuld → gebruikt default
   - Placeholder toont de default value
   - Label toont "(default: value)"

3. **Bij Executie**:
   - Lege velden? → Default wordt gebruikt
   - Gevulde velden? → Gebruiker waarde wordt gebruikt

## 🚀 Voordelen

- **Super simpel**: Geen complexe UI, alles in de prompt zelf
- **Backwards compatible**: `{{var}}` werkt nog steeds
- **Self-documenting**: Je ziet meteen wat de defaults zijn
- **Portable**: Copy/paste prompt = defaults komen mee
- **Intuïtief**: Net als function parameters met defaults

## 🔧 Technische Details

Parser herkent beide formaten:
- `{{name}}` → Variable zonder default
- `{{name:value}}` → Variable met default "value"

Replace functie:
1. Check of gebruiker een waarde heeft ingevuld
2. Zo niet → gebruik default (indien aanwezig)
3. Nog steeds leeg? → Laat origineel staan

## 💡 Best Practices

### DO's ✅
- Gebruik descriptieve defaults: `{{language:JavaScript}}`
- Houd defaults kort: `{{greeting:Hello}}`
- Gebruik voor common values: `{{temperature:0.7}}`

### DON'Ts ❌
- Te lange defaults: `{{text:This is a very long default text that...}}`
- Speciale karakters in defaults (gebruik geen `:` of `}`)
- Nested variables: `{{var1:{{var2}}}` werkt NIET

## 🎯 Use Cases

1. **Templates**: Pre-filled formulieren
2. **Testing**: Snel testen zonder alles in te vullen
3. **Documentation**: Defaults tonen verwachte input
4. **Onboarding**: Nieuwe gebruikers zien voorbeelden
5. **Fallbacks**: Altijd een waarde, nooit leeg

Dit is VEEL simpeler dan aparte velden en werkt perfect! 🚀