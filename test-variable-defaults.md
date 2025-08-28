# Test Variable Defaults

## Test Prompt 1: Customer Service
```
Dear {{customer_name:valued customer}},

Thank you for contacting us about {{issue:your inquiry}}.
We'll respond within {{response_time:24 hours}}.

Best regards,
{{agent_name:Support Team}}
```

## Test Prompt 2: Code Generation
```
Generate a {{language:JavaScript}} function that {{action:sorts an array}}.
The function should be {{style:clean and readable}}.
Add {{tests:unit tests}} to verify the implementation.
```

## Test Prompt 3: Email Template
```
Subject: {{subject:Important Update}}

Hi {{recipient:there}},

{{greeting:Hope you're doing well!}}

{{main_content:Your content here...}}

Thanks,
{{sender:Your Team}}
```

## Expected Behavior:
1. Variables should be detected automatically
2. Default values should appear in placeholders
3. Labels should show "(default: value)"
4. If no user input, default value is used
5. If user provides input, it overrides default