/* eslint-disable @next/next/no-img-element */
import React from 'react';
export default function Image(input){const props={...input};delete props.unoptimized;delete props.fetchPriority;delete props.priority;return <img {...props} alt={input.alt||''}/>}
