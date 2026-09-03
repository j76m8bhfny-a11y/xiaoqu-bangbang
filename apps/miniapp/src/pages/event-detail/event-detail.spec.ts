import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Event Detail Redesign Spec', () => {
  const scssPath = path.resolve(__dirname, 'index.scss');
  const scssContent = fs.readFileSync(scssPath, 'utf-8');
  const tsxPath = path.resolve(__dirname, 'index.tsx');
  const tsxContent = fs.readFileSync(tsxPath, 'utf-8');
  const participantsPath = path.resolve(__dirname, 'participants.tsx');
  const participantsContent = fs.readFileSync(participantsPath, 'utf-8');

  it('T1: should have fixed header + scroll body + fixed action skeleton in SCSS and TSX', () => {
    expect(scssContent).toMatch(/height:\s*100vh/);
    expect(scssContent).toMatch(/flex-direction:\s*column/);
    expect(scssContent).toMatch(/&__header[\s\S]*flex-shrink:\s*0/);
    expect(scssContent).toMatch(/&__body[\s\S]*flex:\s*1/);
    expect(scssContent).toMatch(/&__action[\s\S]*flex-shrink:\s*0/);
    expect(tsxContent).toContain('className="event-detail__header"');
    expect(tsxContent).toContain('className="event-detail__body"');
    expect(tsxContent).toContain('className="event-detail__action"');
    expect(tsxContent).not.toContain('className="event-detail__bottom-spacer"');
  });

  it('T2: header should have dark green gradient and white translucent badges', () => {
    expect(scssContent).toMatch(/linear-gradient\(160deg,\s*#3E7A54\s*0%,\s*#347047\s*100%\)/i);
    expect(scssContent).toMatch(/border-radius:\s*0\s+0\s+32px\s+32px/);
    expect(scssContent).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.2\)/);
  });

  it('T3: participants should have light orange background and stacked avatars with +N badge', () => {
    expect(scssContent).toMatch(/#fbf0dd|\$color-bg-orange/);
    expect(scssContent).toMatch(/margin-left:\s*-16px/);
    expect(scssContent).toMatch(/border:\s*3px\s+solid\s+#fff/i);
    expect(participantsContent).toMatch(/applications\.length\s*-\s*5/);
  });

  it('T4: comments card should have white background, 24px border radius, and 16px margin from participants', () => {
    expect(scssContent).toMatch(/&__comments[\s\S]*border-radius:\s*24px/);
    expect(scssContent).toMatch(/&__comments[\s\S]*margin-top:\s*16px/);
  });
});
