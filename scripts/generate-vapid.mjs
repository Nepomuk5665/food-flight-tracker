import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('Add these to your .env.local:\n');
console.log(`VAPID_SUBJECT=mailto:admin@foodflighttracker.com`);
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
