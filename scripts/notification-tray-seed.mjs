#!/usr/bin/env node
/**
 * Creates real notification tray items for one user (the target) by acting as
 * another (the actor), through the REST endpoints the SDK itself calls. Then
 * reads the target's tray back and reports which item types arrived.
 *
 * Usage:
 *   AMITY_API_KEY=<key> node scripts/notification-tray-seed.mjs
 *   AMITY_API_KEY=<key> node scripts/notification-tray-seed.mjs --invitations
 *   AMITY_API_KEY=<key> node scripts/notification-tray-seed.mjs --check
 *   AMITY_API_KEY=<key> node scripts/notification-tray-seed.mjs --cleanup
 *
 *   (default)      run every scenario, then report the tray
 *   --invitations  only send the target community invitations
 *   --check        only report the tray (event items arrive minutes later)
 *   --cleanup      delete what earlier runs created
 *
 * Environment:
 *   AMITY_API_KEY   required
 *   AMITY_REGION    default "us"; or AMITY_ENDPOINT for a full base URL
 *   TARGET_USER_ID  default "topSocialPlusNew" - receives the notifications
 *   ACTOR_USER_ID   default "notiTrayTester" - created on first login
 *
 * Needs a network that does not require an auth token to sign in. Everything it
 * creates is labelled "[tray test]"; community scenarios use private
 * communities the script creates, never existing ones.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API_KEY = process.env.AMITY_API_KEY;
const BASE_URL =
  process.env.AMITY_ENDPOINT ??
  `https://apix.${process.env.AMITY_REGION ?? 'us'}.amity.co`;
const TARGET_USER_ID = process.env.TARGET_USER_ID ?? 'topSocialPlusNew';
const ACTOR_USER_ID = process.env.ACTOR_USER_ID ?? 'notiTrayTester';
const ACTOR_DISPLAY_NAME = 'Tray Tester';
const LABEL = '[tray test]';
const STATE_FILE = path.join(os.tmpdir(), 'notification-tray-seed.json');

if (!API_KEY) {
  console.error('AMITY_API_KEY is required.');
  process.exit(1);
}

// --- HTTP -------------------------------------------------------------------

async function api(token, method, route, body, query) {
  const url = new URL(route, BASE_URL);
  Object.entries(query ?? {}).forEach(([key, value]) =>
    url.searchParams.set(key, String(value))
  );
  const res = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = data?.message ?? text;
    throw new Error(`${method} ${route} -> ${res.status} ${message}`);
  }
  return data;
}

async function signIn(userId, displayName) {
  const data = await api(undefined, 'POST', '/api/v5/sessions', {
    userId,
    deviceId: `notification-tray-seed-${userId}`,
    ...(displayName ? { displayName } : {}),
    deviceInfo: { kind: 'node', model: 'notification-tray-seed' },
  });
  const user = data.users?.find((u) => u.userId === userId) ?? data.users?.[0];
  return { userId, token: data.accessToken, displayName: user?.displayName };
}

// --- Content ----------------------------------------------------------------

/** A mention of `user` at the start of `text`, as the UIKit composer sends it. */
function withMention(user, text) {
  const name = user.displayName ?? user.userId;
  return {
    text: `@${name} ${text}`,
    mentionees: [{ type: 'user', userIds: [user.userId] }],
    metadata: {
      mentioned: [
        {
          index: 0,
          length: name.length + 1,
          type: 'user',
          userId: user.userId,
          displayName: name,
        },
      ],
    },
  };
}

const firstPost = (data) => data.posts?.[0];
const firstComment = (data) => data.comments?.[0];
const firstCommunity = (data) => data.communities?.[0];

async function createPost(session, targetType, targetId, text, extra = {}) {
  const data = await api(session.token, 'POST', '/api/v4/posts', {
    targetType,
    targetId,
    data: { text },
    ...extra,
  });
  return firstPost(data).postId;
}

async function createComment(session, postId, text, extra = {}) {
  const data = await api(session.token, 'POST', '/api/v3/comments', {
    referenceId: postId,
    referenceType: 'post',
    data: { text },
    ...extra,
  });
  return firstComment(data).commentId;
}

const react = (session, referenceType, referenceId) =>
  api(session.token, 'POST', '/api/v2/reactions', {
    referenceType,
    referenceId,
    reactionName: 'like',
  });

async function createCommunity(
  session,
  name,
  { isPublic = false, requiresJoinApproval = true } = {}
) {
  const data = await api(session.token, 'POST', '/api/v3/communities/', {
    displayName: `${LABEL} ${name}`,
    isPublic,
    isDiscoverable: true,
    requiresJoinApproval,
  });
  return firstCommunity(data).communityId;
}

const createPrivateCommunity = (session, name) =>
  createCommunity(session, name);

/** The community ids `session`'s user holds a pending invitation to. */
async function pendingInvitationCommunityIds(session) {
  const { invitations = [] } = await api(
    session.token,
    'GET',
    '/api/v1/invitations/me',
    undefined,
    {
      'targetType': 'community',
      'statuses[]': 'pending',
      'options[limit]': 50,
    }
  );
  return invitations.map((invitation) => invitation.targetId);
}

/** `requester` asks to join `owner`'s community, and `owner` approves it. */
async function requestAndApprove(owner, requester, communityId) {
  const { joinRequests = [] } = await api(
    requester.token,
    'POST',
    `/api/v4/communities/${communityId}/join`
  );
  const request = joinRequests.find(
    (r) => r.requestorPublicId === requester.userId
  );
  if (!request) {
    throw new Error(`no join request from ${requester.userId} in the response`);
  }
  await api(
    owner.token,
    'POST',
    `/api/v4/communities/${communityId}/join/approve`,
    {
      userId: request.requestorInternalId,
    }
  );
}

// --- State ------------------------------------------------------------------

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { posts: [], comments: [], communities: [], events: [] };
  }
}

const saveState = (state) =>
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

// --- Scenarios --------------------------------------------------------------

/**
 * Each scenario names the tray item it should produce: `category` is the item's
 * trayItemCategory, `actionType` its actionType. One of them is enough to match.
 */
async function runScenarios(
  target,
  actor,
  state,
  { invitationsOnly = false } = {}
) {
  const results = [];
  const ctx = {};

  async function scenario(name, expect, run) {
    try {
      await run();
      results.push({ name, expect, ok: true });
      console.log(`  done  ${name}`);
    } catch (error) {
      results.push({ name, expect, ok: false, error: error.message });
      console.log(`  FAIL  ${name}: ${error.message}`);
    }
  }

  if (invitationsOnly) {
    await runInvitationScenarios();
    return results;
  }

  // Follow again from scratch, so the follow is new.
  await scenario('Actor follows target', { category: 'follow' }, async () => {
    await api(
      actor.token,
      'DELETE',
      `/api/v4/me/following/${target.userId}`
    ).catch(() => {});
    await api(actor.token, 'POST', `/api/v4/me/following/${target.userId}`);
  });

  await scenario('Target posts on own feed (setup)', {}, async () => {
    ctx.targetPostId = await createPost(
      target,
      'user',
      target.userId,
      `${LABEL} a post by the target`
    );
    state.posts.push({ by: 'target', id: ctx.targetPostId });
  });

  await scenario(
    'Actor likes target post',
    { category: 'reaction_on_post' },
    () => react(actor, 'post', ctx.targetPostId)
  );

  await scenario(
    'Actor comments on target post',
    { actionType: 'comment' },
    async () => {
      ctx.actorCommentId = await createComment(
        actor,
        ctx.targetPostId,
        `${LABEL} a comment from the actor`
      );
      state.comments.push({ by: 'actor', id: ctx.actorCommentId });
    }
  );

  await scenario('Target comments on own post (setup)', {}, async () => {
    ctx.targetCommentId = await createComment(
      target,
      ctx.targetPostId,
      `${LABEL} a comment by the target`
    );
    state.comments.push({ by: 'target', id: ctx.targetCommentId });
  });

  await scenario(
    'Actor replies to target comment',
    { actionType: 'reply' },
    async () => {
      const id = await createComment(
        actor,
        ctx.targetPostId,
        `${LABEL} a reply`,
        {
          parentId: ctx.targetCommentId,
        }
      );
      state.comments.push({ by: 'actor', id });
    }
  );

  await scenario(
    'Actor likes target comment',
    { category: 'reaction_on_comment' },
    () => react(actor, 'comment', ctx.targetCommentId)
  );

  await scenario('Target replies to actor comment (setup)', {}, async () => {
    ctx.targetReplyId = await createComment(
      target,
      ctx.targetPostId,
      `${LABEL} a reply by the target`,
      { parentId: ctx.actorCommentId }
    );
    state.comments.push({ by: 'target', id: ctx.targetReplyId });
  });

  await scenario(
    'Actor likes target reply',
    { category: 'reaction_on_reply' },
    () => react(actor, 'comment', ctx.targetReplyId)
  );

  await scenario(
    'Actor mentions target in a post',
    { category: 'mention_in_post' },
    async () => {
      const { text, ...mention } = withMention(
        target,
        `${LABEL} mentioned in a post`
      );
      ctx.actorPostId = await createPost(
        actor,
        'user',
        actor.userId,
        text,
        mention
      );
      state.posts.push({ by: 'actor', id: ctx.actorPostId });
    }
  );

  await scenario(
    'Actor mentions target in a comment',
    { category: 'mention_in_comment' },
    async () => {
      const { text, ...mention } = withMention(
        target,
        `${LABEL} mentioned in a comment`
      );
      ctx.actorMentionCommentId = await createComment(
        actor,
        ctx.actorPostId,
        text,
        mention
      );
      state.comments.push({ by: 'actor', id: ctx.actorMentionCommentId });
    }
  );

  // On a different post from the comment mention: the tray keeps one mention
  // item per post, so a reply on the same post replaced the comment's.
  await scenario(
    'Actor mentions target in a reply',
    { category: 'mention_in_reply' },
    async () => {
      const { text, ...mention } = withMention(
        target,
        `${LABEL} mentioned in a reply`
      );
      const id = await createComment(actor, ctx.targetPostId, text, {
        ...mention,
        parentId: ctx.actorCommentId,
      });
      state.comments.push({ by: 'actor', id });
    }
  );

  // The target moderates this one: the actor's join request goes to the
  // target, and once in, the actor's posts reach the target as a member.
  await scenario('Target creates a private community (setup)', {}, async () => {
    ctx.targetCommunityId = await createPrivateCommunity(
      target,
      'Target community'
    );
    state.communities.push({ by: 'target', id: ctx.targetCommunityId });
  });

  await scenario(
    'Target approves actor into target community (setup)',
    {},
    () => requestAndApprove(target, actor, ctx.targetCommunityId)
  );

  // A request answered at once never shows in the tray, so this one stays
  // pending, in a community of its own.
  await scenario(
    'Actor asks to join, left pending',
    { actionType: 'join_request' },
    async () => {
      const communityId = await createPrivateCommunity(
        target,
        'Pending requests'
      );
      state.communities.push({ by: 'target', id: communityId });
      await api(actor.token, 'POST', `/api/v4/communities/${communityId}/join`);
    }
  );

  await scenario(
    'Actor posts in target community',
    { actionType: 'post' },
    async () => {
      const id = await createPost(
        actor,
        'community',
        ctx.targetCommunityId,
        `${LABEL} a community post`
      );
      state.posts.push({ by: 'actor', id });
    }
  );

  async function createPollPost(question, mention) {
    const { polls } = await api(actor.token, 'POST', '/api/v3/polls', {
      question,
      answerType: 'single',
      answers: [
        { dataType: 'text', data: 'This one' },
        { dataType: 'text', data: 'That one' },
      ],
      closedIn: 24 * 60 * 60 * 1000,
    });
    const data = await api(actor.token, 'POST', '/api/v4/posts', {
      dataType: 'poll',
      targetType: 'community',
      targetId: ctx.targetCommunityId,
      data: { pollId: polls[0].pollId, text: mention?.text ?? question },
      ...(mention
        ? { mentionees: mention.mentionees, metadata: mention.metadata }
        : {}),
    });
    state.posts.push({ by: 'actor', id: firstPost(data).postId });
  }

  await scenario(
    'Actor posts a poll in target community',
    { actionType: 'poll' },
    () => createPollPost(`${LABEL} which one?`)
  );

  // A separate poll: a mention on the same post replaces the poll's item.
  await scenario(
    'Actor posts a poll mentioning target',
    { category: 'mention_in_poll' },
    () =>
      createPollPost(
        `${LABEL} which one, mentioned?`,
        withMention(target, `${LABEL} which one, mentioned?`)
      )
  );

  // The actor owns this one: the target's request is answered by the actor,
  // and events the actor hosts here reach the target as a member.
  await scenario('Actor creates a private community (setup)', {}, async () => {
    ctx.actorCommunityId = await createPrivateCommunity(
      actor,
      'Actor community'
    );
    state.communities.push({ by: 'actor', id: ctx.actorCommunityId });
  });

  await scenario(
    'Actor approves target join request',
    { category: 'respond_on_join_request' },
    () => requestAndApprove(actor, target, ctx.actorCommunityId)
  );

  // The server needs an event to start at least 15 minutes out. Its "has
  // started" item arrives at the start time; re-run with --check to see it.
  // The reminder's lead time is not documented, and an event created this
  // close to its start got none.
  await scenario(
    'Actor creates an event in own community',
    { category: 'event_created' },
    async () => {
      const startTime = new Date(Date.now() + 16 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const data = await api(actor.token, 'POST', '/api/v1/events', {
        title: `${LABEL} Event`,
        description: 'Created by notification-tray-seed.',
        type: 'in_person',
        location: 'Test location',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        originType: 'community',
        originId: ctx.actorCommunityId,
      });
      ctx.eventId = data.events?.[0]?.eventId;
      state.events.push({ by: 'actor', id: ctx.eventId });
    }
  );

  await scenario(
    'Target RSVPs going (for event started)',
    { category: 'event_started', later: true },
    () =>
      api(target.token, 'POST', `/api/v1/events/${ctx.eventId}/rsvp`, {
        status: 'going',
      })
  );

  await runInvitationScenarios();

  return results;

  // Invitations show in the tray's Requests section, not as tray items. One
  // community needs approval to join, which makes declining ask first; the
  // other does not.
  async function runInvitationScenarios() {
    async function inviteToNewCommunity(name, settings) {
      const communityId = await createCommunity(actor, name, settings);
      state.communities.push({ by: 'actor', id: communityId });
      const { invitations = [] } = await api(
        actor.token,
        'POST',
        '/api/v1/invitations',
        {
          type: 'communityMemberInvite',
          targetType: 'community',
          targetId: communityId,
          userIds: [target.userId],
        }
      );
      if (invitations[0]?.status === 'approved') {
        throw new Error(
          'accepted on creation: this network adds invited users at once ' +
            '(membershipAcceptance "automatic"), so nothing stays pending'
        );
      }
      const pending = await pendingInvitationCommunityIds(target);
      if (!pending.includes(communityId)) {
        throw new Error('the invitation is not among the target pending ones');
      }
    }

    await scenario(
      'Actor invites target (join needs approval)',
      { invitation: true },
      () => inviteToNewCommunity('Invite, approval needed')
    );

    await scenario(
      'Actor invites target (open to join)',
      { invitation: true },
      () =>
        inviteToNewCommunity('Invite, open', {
          isPublic: true,
          requiresJoinApproval: false,
        })
    );
  }
}

// --- Report -----------------------------------------------------------------

async function fetchTray(target) {
  const data = await api(
    target.token,
    'GET',
    '/api/v1/notification-tray',
    undefined,
    {
      'options[limit]': 50,
    }
  );
  return data.notificationTrayItems ?? [];
}

const matchesAny = (items, expect) =>
  items.some(
    (item) =>
      (expect.category && item.trayItemCategory === expect.category) ||
      (expect.actionType && item.actionType === expect.actionType)
  );

/**
 * The server writes tray items asynchronously, up to about a minute after the
 * action, so keep reading until every expected item is in or time runs out.
 */
async function waitForTray(target, results, since) {
  const expected = results.filter(
    (r) => r.ok && !r.expect.later && (r.expect.category || r.expect.actionType)
  );
  const deadline = Date.now() + 2 * 60 * 1000;
  for (;;) {
    const items = await fetchTray(target);
    const recent = items.filter(
      (item) => new Date(item.lastOccurredAt) >= since
    );
    const waiting = expected.filter((r) => !matchesAny(recent, r.expect));
    if (!waiting.length || Date.now() > deadline) return items;
    console.log(`  waiting for ${waiting.length} tray item(s)...`);
    await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
  }
}

function report(items, results, since) {
  const recent = since
    ? items.filter((item) => new Date(item.lastOccurredAt) >= since)
    : items;

  console.log(`\nTray for ${TARGET_USER_ID}: ${items.length} items`);
  recent.forEach((item) => {
    const kind = item.trayItemCategory ?? `(${item.actionType})`;
    console.log(`  ${kind.padEnd(26)} ${item.text}`);
  });

  if (!results) return;

  const matches = (expect) => matchesAny(recent, expect);

  console.log('\nScenario                                   tray item');
  results
    .filter(
      ({ expect }) => expect.category || expect.actionType || expect.invitation
    )
    .forEach(({ name, expect, ok }) => {
      const label = [expect.category, expect.actionType]
        .filter(Boolean)
        .join(' / ');
      let status;
      if (!ok) status = 'not run (request failed)';
      else if (expect.invitation) status = 'arrived (pending invitation)';
      else if (matches(expect)) status = `arrived (${label})`;
      else if (expect.later) status = `pending, check later (${label})`;
      else status = `MISSING (${label})`;
      console.log(`  ${name.padEnd(41)} ${status}`);
    });
}

// --- Cleanup ----------------------------------------------------------------

async function cleanup(target, actor) {
  const state = loadState();
  const as = (by) => (by === 'target' ? target : actor);
  const remove = async (label, list, route) => {
    for (const { by, id } of list) {
      if (!id) continue;
      await api(as(by).token, 'DELETE', route(id)).then(
        () => console.log(`  deleted ${label} ${id}`),
        (error) =>
          console.log(`  could not delete ${label} ${id}: ${error.message}`)
      );
    }
  };
  await remove('event', state.events, (id) => `/api/v1/events/${id}`);
  await remove('comment', state.comments, (id) => `/api/v4/comments/${id}`);
  await remove('post', state.posts, (id) => `/api/v4/posts/${id}`);
  await remove(
    'community',
    state.communities,
    (id) => `/api/v3/communities/${id}`
  );
  await api(
    actor.token,
    'DELETE',
    `/api/v4/me/following/${target.userId}`
  ).catch(() => {});
  fs.rmSync(STATE_FILE, { force: true });
}

// --- Main -------------------------------------------------------------------

const mode = process.argv.includes('--cleanup')
  ? 'cleanup'
  : process.argv.includes('--check')
  ? 'check'
  : 'run';

console.log(`Endpoint ${BASE_URL}`);
const target = await signIn(TARGET_USER_ID);
const actor = await signIn(ACTOR_USER_ID, ACTOR_DISPLAY_NAME);
console.log(
  `Target ${target.userId} (${target.displayName}), actor ${actor.userId} (${actor.displayName})\n`
);

if (mode === 'cleanup') {
  await cleanup(target, actor);
} else if (mode === 'check') {
  report(await fetchTray(target));
} else {
  const startedAt = new Date(Date.now() - 1000);
  const state = loadState();
  const results = await runScenarios(target, actor, state, {
    invitationsOnly: process.argv.includes('--invitations'),
  });
  saveState(state);
  console.log('');
  report(await waitForTray(target, results, startedAt), results, startedAt);
  console.log(`\nCreated content is recorded in ${STATE_FILE} for --cleanup.`);
}
