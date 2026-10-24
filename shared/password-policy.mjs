import policy from './password-policy.json' with {type:'json'};
export {policy as passwordPolicy};
export function passwordRules(password){
 return {length:Array.from(password).length>=policy.minCharacters,
  upper:[...policy.upper].some(char=>password.includes(char)),lower:[...policy.lower].some(char=>password.includes(char)),
  number:[...policy.digits].some(char=>password.includes(char)),special:[...policy.symbols].some(char=>password.includes(char)),
  maxBytes:new TextEncoder().encode(password).byteLength<=policy.maxBytes};
}
