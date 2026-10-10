/**
 * Judge-able coding problems (stdin -> stdout), adapted from the algorithmic questions in the
 * engineering question bank (Q091-Q129). SQL / Pandas / REST / ML questions are not here because
 * they cannot be judged by comparing printed output.
 *
 * Each problem has a reference `solve(input) => output`. At seed time the expected output of every
 * test case is produced by running it, and the sample outputs written below are asserted against it.
 */

export type Problem = {
  code: string;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  samples: { input: string; output: string }[];
  hidden: string[];
  solve: (input: string) => string;
  timeLimitMs?: number;
};

/* ---------------- helpers ---------------- */

const toks = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const ints = (s: string) => toks(s).map(Number);
const rows = (s: string) => s.trim().split("\n");
const firstLine = (s: string) => s.split("\n")[0]!.replace(/\r$/, "");

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rint = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const arr = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => rint(r, lo, hi));
const arrCase = (a: number[]) => `${a.length}\n${a.join(" ")}\n`;

/* ---------------- problems ---------------- */

const problems: Problem[] = [];

problems.push({
  code: "Q091", slug: "factorial", title: "Factorial", difficulty: "Easy", topic: "Recursion",
  statement: "Given a non-negative integer n, print n! (n factorial). Try solving it with recursion.",
  inputFormat: "A single integer n.",
  outputFormat: "A single integer: n!",
  constraints: "0 <= n <= 20",
  samples: [{ input: "5\n", output: "120" }, { input: "0\n", output: "1" }],
  hidden: ["1\n", "2\n", "10\n", "15\n", "19\n", "20\n"],
  solve: (input) => { let f = 1n; for (let i = 2n; i <= BigInt(toks(input)[0]!); i++) f *= i; return String(f); },
});

problems.push({
  code: "Q092", slug: "fibonacci-series", title: "Fibonacci Series", difficulty: "Easy", topic: "Recursion",
  statement: "Print the first n terms of the Fibonacci series, starting with 0 and 1.",
  inputFormat: "A single integer n.",
  outputFormat: "The first n Fibonacci terms on one line, separated by single spaces.",
  constraints: "1 <= n <= 30",
  samples: [{ input: "7\n", output: "0 1 1 2 3 5 8" }, { input: "1\n", output: "0" }],
  hidden: ["2\n", "3\n", "10\n", "20\n", "30\n"],
  solve: (input) => { const n = Number(toks(input)[0]); const f = [0, 1]; while (f.length < n) f.push(f[f.length - 1]! + f[f.length - 2]!); return f.slice(0, n).join(" "); },
});

problems.push({
  code: "Q093", slug: "prime-check", title: "Prime Number Check", difficulty: "Easy", topic: "Math",
  statement: "Check whether the given integer is a prime number. Note that 1 is not prime.",
  inputFormat: "A single integer n.",
  outputFormat: "Print Prime or Not Prime.",
  constraints: "1 <= n <= 10^9",
  samples: [{ input: "29\n", output: "Prime" }, { input: "100\n", output: "Not Prime" }],
  hidden: ["1\n", "2\n", "3\n", "4\n", "17\n", "25\n", "97\n", "7919\n", "999999937\n", "1000000000\n"],
  solve: (input) => { const n = Number(toks(input)[0]); if (n < 2) return "Not Prime"; for (let i = 2; i * i <= n; i++) if (n % i === 0) return "Not Prime"; return "Prime"; },
});

problems.push({
  code: "Q094", slug: "largest-element", title: "Largest Element in an Array", difficulty: "Easy", topic: "Arrays",
  statement: "Find the largest element of an array. Do not use a sorting function.",
  inputFormat: "The first line has n. The second line has n integers separated by spaces.",
  outputFormat: "The maximum value.",
  constraints: "1 <= n <= 10^5\n-10^9 <= each element <= 10^9",
  samples: [{ input: "5\n4 9 2 7 1\n", output: "9" }],
  hidden: [arrCase([7]), arrCase([-5, -2, -9]), arrCase([3, 3, 3]), arrCase([1000000000, -1000000000, 0]), arrCase(arr(rng(94), 1000, -1000000000, 1000000000)), arrCase(arr(rng(95), 50000, -1000000000, 1000000000))],
  solve: (input) => { const l = rows(input); return String(Math.max(...ints(l[1]!))); },
});

problems.push({
  code: "Q095", slug: "reverse-integer", title: "Reverse an Integer", difficulty: "Easy", topic: "Math",
  statement: "Reverse the digits of an integer without converting it to a string. Keep the sign. Trailing zeros disappear after reversing (12340 becomes 4321).",
  inputFormat: "A single integer n.",
  outputFormat: "The reversed integer.",
  constraints: "-10^9 <= n <= 10^9",
  samples: [{ input: "12340\n", output: "4321" }, { input: "-123\n", output: "-321" }],
  hidden: ["0\n", "7\n", "100\n", "-100\n", "1000000000\n", "987654321\n", "-120034\n"],
  solve: (input) => { const n = Number(toks(input)[0]); const s = n < 0 ? -1 : 1; let x = Math.abs(n), r = 0; while (x > 0) { r = r * 10 + (x % 10); x = Math.floor(x / 10); } return String(r === 0 ? 0 : s * r); },
});

problems.push({
  code: "Q096", slug: "count-vowels", title: "Count Vowels", difficulty: "Easy", topic: "Strings",
  statement: "Count the vowels (a, e, i, o, u, in either upper or lower case) in the given line of text.",
  inputFormat: "One line of text (letters and spaces).",
  outputFormat: "The number of vowels.",
  constraints: "1 <= length <= 10^5",
  samples: [{ input: "engineering\n", output: "5" }, { input: "Hello World\n", output: "3" }],
  hidden: ["a\n", "rhythm\n", "AEIOU\n", "bcdfg\n", "Data Structures And Algorithms\n", "aeiou".repeat(20000) + "\n"],
  solve: (input) => String((firstLine(input).match(/[aeiou]/gi) ?? []).length),
});

problems.push({
  code: "Q097", slug: "second-largest-distinct", title: "Second Largest Distinct Element", difficulty: "Easy", topic: "Arrays",
  statement: "Print the second largest distinct value in a list of integers. If there is no second distinct value, print -1.",
  inputFormat: "The first line has n. The second line has n integers.",
  outputFormat: "The second largest distinct value, or -1.",
  constraints: "1 <= n <= 10^5\n-10^9 <= each element <= 10^9",
  samples: [{ input: "5\n10 4 8 10 6\n", output: "8" }, { input: "3\n5 5 5\n", output: "-1" }],
  hidden: [arrCase([1]), arrCase([2, 1]), arrCase([-3, -1, -2]), arrCase([9, 9, 8, 8]), arrCase([1, 2, 3, 4, 5, 5]), arrCase(arr(rng(97), 2000, -50, 50))],
  solve: (input) => { const d = [...new Set(ints(rows(input)[1]!))].sort((a, b) => b - a); return String(d.length >= 2 ? d[1] : -1); },
});

problems.push({
  code: "Q098", slug: "palindrome-check", title: "Palindrome Check", difficulty: "Easy", topic: "Strings",
  statement: "Check whether a string reads the same forwards and backwards. The comparison is case-sensitive.",
  inputFormat: "A single string with no spaces.",
  outputFormat: "Print True if it is a palindrome, otherwise False.",
  constraints: "1 <= length <= 10^5",
  samples: [{ input: "level\n", output: "True" }, { input: "hello\n", output: "False" }],
  hidden: ["a\n", "ab\n", "abba\n", "Racecar\n", "12321\n", "abcdedcba\n", "a".repeat(50000) + "b" + "a".repeat(50000) + "\n"],
  solve: (input) => { const s = firstLine(input); return s === [...s].reverse().join("") ? "True" : "False"; },
});

problems.push({
  code: "Q101", slug: "binary-search", title: "Binary Search", difficulty: "Easy", topic: "Binary Search",
  statement: "Given a sorted array of distinct integers and a target, print the index (0-based) of the target, or -1 if it is absent. Aim for O(log n).",
  inputFormat: "Line 1: n. Line 2: n integers in increasing order. Line 3: the target.",
  outputFormat: "The index of the target, or -1.",
  constraints: "1 <= n <= 10^5\nAll elements are distinct.",
  samples: [{ input: "5\n1 3 5 7 9\n7\n", output: "3" }, { input: "5\n1 3 5 7 9\n4\n", output: "-1" }],
  hidden: ["1\n5\n5\n", "1\n5\n6\n", "4\n-10 -3 0 8\n-10\n", "4\n-10 -3 0 8\n8\n", "4\n-10 -3 0 8\n100\n",
    `50000\n${Array.from({ length: 50000 }, (_, i) => i * 2).join(" ")}\n49998\n`, `50000\n${Array.from({ length: 50000 }, (_, i) => i * 2).join(" ")}\n49999\n`],
  solve: (input) => { const l = rows(input); const a = ints(l[1]!); const t = Number(l[2]); let lo = 0, hi = a.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m] === t) return String(m); if (a[m]! < t) lo = m + 1; else hi = m - 1; } return "-1"; },
});

problems.push({
  code: "Q117", slug: "valid-email", title: "Validate an Email-like String", difficulty: "Easy", topic: "Strings",
  statement: "A string is valid if it contains exactly one '@' character, and there is at least one character before it and at least one character after it.",
  inputFormat: "A single string with no spaces.",
  outputFormat: "Print True if valid, otherwise False.",
  constraints: "1 <= length <= 1000",
  samples: [{ input: "student@example.com\n", output: "True" }, { input: "no-at-sign.com\n", output: "False" }],
  hidden: ["a@b\n", "@b.com\n", "a@\n", "a@@b.com\n", "a@b@c.com\n", "x@y.z\n", "@\n"],
  solve: (input) => { const p = firstLine(input).split("@"); return p.length === 2 && p[0] !== "" && p[1] !== "" ? "True" : "False"; },
});

function twoSumCase(seed: number, n: number): string {
  const r = rng(seed);
  for (;;) {
    const a = arr(r, n, -1000000, 1000000);
    const i = rint(r, 0, n - 2), j = rint(r, i + 1, n - 1);
    const t = a[i]! + a[j]!;
    let c = 0;
    for (let x = 0; x < n && c < 2; x++) for (let y = x + 1; y < n; y++) if (a[x]! + a[y]! === t && ++c > 1) break;
    if (c === 1) return `${n}\n${a.join(" ")}\n${t}\n`;
  }
}
problems.push({
  code: "Q109", slug: "two-sum", title: "Two Sum", difficulty: "Medium", topic: "Hashing",
  statement: "Given an array of integers and a target, find the two different positions whose values add up to the target. There is exactly one such pair.",
  inputFormat: "Line 1: n. Line 2: n integers. Line 3: the target.",
  outputFormat: "The two indices i and j (0-based, i < j) separated by a space.",
  constraints: "2 <= n <= 2000\nExactly one pair of positions sums to the target.",
  samples: [{ input: "4\n2 7 11 15\n9\n", output: "0 1" }, { input: "3\n3 2 4\n6\n", output: "1 2" }],
  hidden: ["2\n3 3\n6\n", "4\n-1 -2 -3 -4\n-6\n", "5\n0 4 3 0 9\n0\n", twoSumCase(109, 50), twoSumCase(110, 500), twoSumCase(111, 2000)],
  solve: (input) => { const l = rows(input); const a = ints(l[1]!); const t = Number(l[2]); const seen = new Map<number, number>(); for (let j = 0; j < a.length; j++) { const i = seen.get(t - a[j]!); if (i !== undefined) return `${i} ${j}`; seen.set(a[j]!, j); } return "-1"; },
});

problems.push({
  code: "Q108", slug: "first-non-repeating-character", title: "First Non-Repeating Character", difficulty: "Medium", topic: "Hashing",
  statement: "Find the first character of a lowercase string that appears exactly once. Print it, or -1 if every character repeats.",
  inputFormat: "A single lowercase string.",
  outputFormat: "The character, or -1.",
  constraints: "1 <= length <= 10^5",
  samples: [{ input: "swiss\n", output: "w" }, { input: "aabb\n", output: "-1" }],
  hidden: ["a\n", "abcabc\n", "leetcode\n", "loveleetcode\n", "zzzzzy\n", Array.from({ length: 50000 }, (_, i) => String.fromCharCode(97 + (i % 25))).join("") + "z\n"],
  solve: (input) => { const s = firstLine(input); const c = new Map<string, number>(); for (const ch of s) c.set(ch, (c.get(ch) ?? 0) + 1); for (const ch of s) if (c.get(ch) === 1) return ch; return "-1"; },
});

problems.push({
  code: "Q104", slug: "reverse-linked-list", title: "Reverse a Linked List", difficulty: "Medium", topic: "Linked List",
  statement: "A singly linked list is described by its node values from head to tail. Build the list, reverse it iteratively by re-pointing the links, and print the values from the new head to the new tail.",
  inputFormat: "Line 1: n. Line 2: n node values.",
  outputFormat: "The reversed values separated by spaces.",
  constraints: "1 <= n <= 1000\n-10^4 <= value <= 10^4",
  samples: [{ input: "5\n1 2 3 4 5\n", output: "5 4 3 2 1" }],
  hidden: [arrCase([42]), arrCase([1, 2]), arrCase([-1, 0, 1]), arrCase([5, 5, 5, 5]), arrCase(arr(rng(104), 1000, -10000, 10000))],
  solve: (input) => ints(rows(input)[1]!).reverse().join(" "),
});

problems.push({
  code: "Q107", slug: "merge-sort", title: "Merge Sort", difficulty: "Medium", topic: "Sorting",
  statement: "Sort the array in ascending order using merge sort. Do not use a built-in sort function.",
  inputFormat: "Line 1: n. Line 2: n integers.",
  outputFormat: "The sorted array separated by spaces.",
  constraints: "1 <= n <= 10^4\n-10^9 <= each element <= 10^9",
  samples: [{ input: "5\n5 2 8 1 3\n", output: "1 2 3 5 8" }],
  hidden: [arrCase([1]), arrCase([2, 1]), arrCase([1, 2, 3, 4, 5]), arrCase([9, 7, 5, 3, 1]), arrCase([4, 4, 2, 2, 4, 2]), arrCase(arr(rng(107), 5000, -1000000000, 1000000000)), arrCase(arr(rng(108), 10000, -1000000000, 1000000000))],
  solve: (input) => ints(rows(input)[1]!).sort((a, b) => a - b).join(" "),
});

function graphCase(seed: number, n: number, m: number, src: number): string {
  const r = rng(seed);
  const e = Array.from({ length: m }, () => `${rint(r, 0, n - 1)} ${rint(r, 0, n - 1)}`);
  return `${n} ${m}\n${e.join("\n")}${m ? "\n" : ""}${src}\n`;
}
problems.push({
  code: "Q110", slug: "bfs-traversal", title: "BFS Traversal", difficulty: "Medium", topic: "Graphs",
  statement: "Run a breadth-first search on an undirected graph from a source vertex. Whenever a vertex has several unvisited neighbours, visit them in increasing order of vertex number. Print only the vertices that can be reached.",
  inputFormat: "Line 1: n and m (vertices are 0..n-1, m edges).\nNext m lines: u v describing an undirected edge.\nLast line: the source vertex.",
  outputFormat: "The BFS visiting order separated by spaces.",
  constraints: "1 <= n <= 1000\n0 <= m <= 5000\nThe graph may contain duplicate edges and self-loops.",
  samples: [{ input: "4 3\n0 1\n0 2\n1 3\n0\n", output: "0 1 2 3" }],
  hidden: ["1 0\n0\n", "5 2\n0 1\n3 4\n3\n", "4 4\n0 1\n1 2\n2 3\n3 0\n2\n", "3 3\n0 0\n0 1\n0 1\n0\n", graphCase(110, 50, 120, 7), graphCase(111, 200, 400, 0), graphCase(112, 1000, 3000, 500)],
  solve: (input) => {
    const l = rows(input); const [n, m] = ints(l[0]!) as [number, number];
    const adj = Array.from({ length: n }, () => new Set<number>());
    for (let i = 1; i <= m; i++) { const [u, v] = ints(l[i]!) as [number, number]; adj[u]!.add(v); adj[v]!.add(u); }
    const src = Number(l[m + 1]); const seen = new Array<boolean>(n).fill(false); const order: number[] = []; const q = [src]; seen[src] = true;
    for (let h = 0; h < q.length; h++) { const u = q[h]!; order.push(u); for (const v of [...adj[u]!].sort((a, b) => a - b)) if (!seen[v]) { seen[v] = true; q.push(v); } }
    return order.join(" ");
  },
});

problems.push({
  code: "Q118", slug: "fcfs-scheduling", title: "FCFS Average Waiting Time", difficulty: "Medium", topic: "Operating Systems",
  statement: "Processes arrive at time 0 in the given order and are served First-Come-First-Served. Compute the average waiting time. The waiting time of a process is the time it waits before its burst starts.",
  inputFormat: "Line 1: n. Line 2: n burst times in arrival order.",
  outputFormat: "The average waiting time rounded to exactly 2 decimal places.",
  constraints: "1 <= n <= 1000\n1 <= burst time <= 1000",
  samples: [{ input: "3\n5 3 2\n", output: "4.33" }],
  hidden: [arrCase([7]), arrCase([1, 1, 1, 1]), arrCase([10, 1, 1]), arrCase([1, 2, 3, 4, 5, 6]), arrCase(arr(rng(118), 1000, 1, 1000))],
  solve: (input) => { const b = ints(rows(input)[1]!); let t = 0, w = 0; for (const x of b) { w += t; t += x; } return (w / b.length).toFixed(2); },
});

problems.push({
  code: "Q120", slug: "subnet-usable-hosts", title: "Usable Hosts in a Subnet", difficulty: "Medium", topic: "Computer Networks",
  statement: "Given an IPv4 address with a CIDR prefix, print the number of usable host addresses in that subnet. For prefixes up to /30 this is 2^(32 - prefix) - 2 (network and broadcast addresses are not usable). For /31 and /32 print 0.",
  inputFormat: "A single line a.b.c.d/p",
  outputFormat: "The number of usable host addresses.",
  constraints: "0 <= p <= 32",
  samples: [{ input: "192.168.1.0/24\n", output: "254" }],
  hidden: ["10.0.0.0/8\n", "172.16.0.0/16\n", "192.168.1.128/25\n", "192.168.1.4/30\n", "192.168.1.4/31\n", "192.168.1.4/32\n", "0.0.0.0/0\n"],
  solve: (input) => { const p = Number(firstLine(input).split("/")[1]); return String(p <= 30 ? 2 ** (32 - p) - 2 : 0); },
});

function opsCase(seed: number, count: number, kind: "stack" | "queue"): string {
  const r = rng(seed);
  const ops: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = r();
    if (x < 0.5) ops.push(`${kind === "stack" ? "push" : "enqueue"} ${rint(r, -1000, 1000)}`);
    else if (x < 0.85 || kind === "queue") ops.push(kind === "stack" ? "pop" : "dequeue");
    else ops.push("peek");
  }
  return `${count}\n${ops.join("\n")}\n`;
}
problems.push({
  code: "Q102", slug: "stack-operations", title: "Stack Operations", difficulty: "Medium", topic: "Stack",
  statement: "Implement a stack and process a list of operations.\n\npush x: push x onto the stack (prints nothing)\npop: remove the top and print it\npeek: print the top without removing it\n\nIf pop or peek is used on an empty stack, print EMPTY.",
  inputFormat: "Line 1: the number of operations q. Then q lines, each an operation.",
  outputFormat: "One line per pop / peek operation.",
  constraints: "1 <= q <= 10^4\n-10^4 <= x <= 10^4",
  samples: [{ input: "3\npush 10\npush 20\npop\n", output: "20" }, { input: "4\npush 5\npeek\npop\npop\n", output: "5\n5\nEMPTY" }],
  hidden: ["2\npop\npeek\n", "5\npush 1\npush 2\npush 3\npop\npeek\n", "6\npush -7\npop\npush 8\npush 9\npop\npop\n", opsCase(102, 100, "stack"), opsCase(103, 2000, "stack"), opsCase(104, 10000, "stack")],
  solve: (input) => { const l = rows(input); const st: number[] = []; const out: string[] = []; for (let i = 1; i < l.length; i++) { const [op, v] = l[i]!.split(" "); if (op === "push") st.push(Number(v)); else if (op === "pop") out.push(st.length ? String(st.pop()) : "EMPTY"); else out.push(st.length ? String(st[st.length - 1]) : "EMPTY"); } return out.join("\n"); },
});

problems.push({
  code: "Q103", slug: "queue-using-two-stacks", title: "Queue Using Two Stacks", difficulty: "Medium", topic: "Queue",
  statement: "Implement a queue using only two stacks and process a list of operations.\n\nenqueue x: add x at the back (prints nothing)\ndequeue: remove the front element and print it\n\nIf dequeue is used on an empty queue, print EMPTY.",
  inputFormat: "Line 1: the number of operations q. Then q lines, each an operation.",
  outputFormat: "One line per dequeue operation.",
  constraints: "1 <= q <= 10^4\n-10^4 <= x <= 10^4",
  samples: [{ input: "3\nenqueue 10\nenqueue 20\ndequeue\n", output: "10" }],
  hidden: ["2\ndequeue\ndequeue\n", "5\nenqueue 1\nenqueue 2\ndequeue\nenqueue 3\ndequeue\n", "4\nenqueue 9\ndequeue\ndequeue\nenqueue 4\n", opsCase(105, 100, "queue"), opsCase(106, 2000, "queue"), opsCase(107, 10000, "queue")],
  solve: (input) => { const l = rows(input); const q: number[] = []; let h = 0; const out: string[] = []; for (let i = 1; i < l.length; i++) { const [op, v] = l[i]!.split(" "); if (op === "enqueue") q.push(Number(v)); else out.push(h < q.length ? String(q[h++]) : "EMPTY"); } return out.join("\n"); },
});

function lruCase(seed: number, cap: number, q: number, keys: number): string {
  const r = rng(seed);
  const ops = Array.from({ length: q }, () => (r() < 0.5 ? `put ${rint(r, 1, keys)} ${rint(r, 1, 1000)}` : `get ${rint(r, 1, keys)}`));
  if (!ops.some((o) => o.startsWith("get"))) ops.push("get 1");
  return `${cap}\n${ops.length}\n${ops.join("\n")}\n`;
}
problems.push({
  code: "Q129", slug: "lru-cache", title: "LRU Cache", difficulty: "Hard", topic: "Design",
  statement: "Design a Least-Recently-Used cache with a fixed capacity.\n\nput k v: store the value. If the key exists, update it. If the cache is full, first evict the least recently used key. Updating counts as a use.\nget k: print the value of key k, or -1 if it is not in the cache. A successful get counts as a use.\n\nBoth operations should run in O(1) on average.",
  inputFormat: "Line 1: capacity. Line 2: the number of operations q. Then q lines, each an operation.",
  outputFormat: "One line per get operation.",
  constraints: "1 <= capacity <= 1000\n1 <= q <= 10^4\nKeys and values are integers between 1 and 10^4.",
  samples: [{ input: "2\n5\nput 1 10\nput 2 20\nget 1\nput 3 30\nget 2\n", output: "10\n-1" }],
  hidden: ["1\n4\nput 1 1\nput 2 2\nget 1\nget 2\n", "2\n6\nput 1 1\nput 2 2\nput 1 5\nput 3 3\nget 1\nget 2\n", "2\n5\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 1\n", lruCase(129, 3, 200, 6), lruCase(130, 50, 3000, 120), lruCase(131, 500, 10000, 900)],
  solve: (input) => {
    const l = rows(input); const cap = Number(l[0]); const q = Number(l[1]); const m = new Map<number, number>(); const out: string[] = [];
    for (let i = 2; i < 2 + q; i++) {
      const [op, k, v] = l[i]!.split(" "); const key = Number(k);
      if (op === "put") { if (m.has(key)) m.delete(key); else if (m.size >= cap) m.delete(m.keys().next().value as number); m.set(key, Number(v)); }
      else if (m.has(key)) { const val = m.get(key)!; m.delete(key); m.set(key, val); out.push(String(val)); } else out.push("-1");
    }
    return out.join("\n");
  },
});

problems.push({
  code: "Q123", slug: "longest-increasing-subsequence", title: "Longest Increasing Subsequence", difficulty: "Hard", topic: "Dynamic Programming",
  statement: "Find the length of the longest strictly increasing subsequence of an array. A subsequence keeps the original order but may skip elements.",
  inputFormat: "Line 1: n. Line 2: n integers.",
  outputFormat: "The length of the longest strictly increasing subsequence.",
  constraints: "1 <= n <= 2000\n-10^9 <= each element <= 10^9",
  samples: [{ input: "8\n10 9 2 5 3 7 101 18\n", output: "4" }],
  hidden: [arrCase([5]), arrCase([7, 7, 7, 7]), arrCase([5, 4, 3, 2, 1]), arrCase(Array.from({ length: 1000 }, (_, i) => i)), arrCase([0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]), arrCase(arr(rng(123), 1500, -1000000000, 1000000000)), arrCase(arr(rng(124), 2000, 0, 50))],
  solve: (input) => { const a = ints(rows(input)[1]!); const t: number[] = []; for (const x of a) { let lo = 0, hi = t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (t[m]! < x) lo = m + 1; else hi = m; } t[lo] = x; } return String(t.length); },
});

function knapCase(seed: number, n: number, w: number): string {
  const r = rng(seed);
  return `${n} ${w}\n${arr(r, n, 1, Math.max(1, Math.floor(w / 4))).join(" ")}\n${arr(r, n, 1, 1000).join(" ")}\n`;
}
problems.push({
  code: "Q124", slug: "knapsack-01", title: "0/1 Knapsack", difficulty: "Hard", topic: "Dynamic Programming",
  statement: "You have n items, each with a weight and a value, and a bag with a weight capacity. Each item can be taken at most once. Print the maximum total value that fits in the bag.",
  inputFormat: "Line 1: n and the capacity W.\nLine 2: n weights.\nLine 3: n values.",
  outputFormat: "The maximum total value.",
  constraints: "1 <= n <= 200\n0 <= W <= 5000\n1 <= weight, value <= 1000",
  samples: [{ input: "3 5\n2 3 4\n4 5 7\n", output: "9" }],
  hidden: ["1 10\n5\n50\n", "1 3\n5\n50\n", "3 0\n1 2 3\n10 20 30\n", "4 7\n1 3 4 5\n1 4 5 7\n", knapCase(124, 20, 100), knapCase(125, 100, 1000), knapCase(126, 200, 5000)],
  solve: (input) => { const l = rows(input); const [n, W] = ints(l[0]!) as [number, number]; const w = ints(l[1]!), v = ints(l[2]!); const dp = new Array<number>(W + 1).fill(0); for (let i = 0; i < n; i++) for (let c = W; c >= w[i]!; c--) dp[c] = Math.max(dp[c]!, dp[c - w[i]!]! + v[i]!); return String(dp[W]); },
});

function dijkstraCase(seed: number, n: number, m: number, src: number): string {
  const r = rng(seed);
  const e = Array.from({ length: m }, () => `${rint(r, 0, n - 1)} ${rint(r, 0, n - 1)} ${rint(r, 0, 100)}`);
  return `${n} ${m}\n${e.join("\n")}${m ? "\n" : ""}${src}\n`;
}
problems.push({
  code: "Q121", slug: "dijkstra-shortest-path", title: "Dijkstra Shortest Paths", difficulty: "Hard", topic: "Graphs",
  statement: "Given a directed graph with non-negative edge weights, compute the shortest distance from a source vertex to every vertex. Print -1 for vertices that cannot be reached.",
  inputFormat: "Line 1: n and m (vertices are 0..n-1, m directed edges).\nNext m lines: u v w meaning an edge from u to v with weight w.\nLast line: the source vertex.",
  outputFormat: "n distances (for vertices 0..n-1) separated by spaces.",
  constraints: "1 <= n <= 1000\n0 <= m <= 5000\n0 <= w <= 100",
  samples: [{ input: "3 3\n0 1 4\n0 2 1\n2 1 2\n0\n", output: "0 3 1" }],
  hidden: ["1 0\n0\n", "3 1\n0 1 5\n0\n", "4 4\n0 1 0\n1 2 0\n2 3 0\n0 3 9\n0\n", "3 3\n0 1 1\n1 2 1\n2 0 1\n1\n", dijkstraCase(121, 30, 90, 0), dijkstraCase(122, 300, 1200, 5), dijkstraCase(123, 1000, 5000, 0)],
  solve: (input) => {
    const l = rows(input); const [n, m] = ints(l[0]!) as [number, number];
    const adj = Array.from({ length: n }, () => [] as [number, number][]);
    for (let i = 1; i <= m; i++) { const [u, v, w] = ints(l[i]!) as [number, number, number]; adj[u]!.push([v, w]); }
    const src = Number(l[m + 1]); const dist = new Array<number>(n).fill(Infinity); const done = new Array<boolean>(n).fill(false); dist[src] = 0;
    for (let k = 0; k < n; k++) { let u = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i]! < Infinity && (u === -1 || dist[i]! < dist[u]!)) u = i; if (u === -1) break; done[u] = true; for (const [v, w] of adj[u]!) if (dist[u]! + w < dist[v]!) dist[v] = dist[u]! + w; }
    return dist.map((d) => (d === Infinity ? -1 : d)).join(" ");
  },
});

function dagCase(seed: number, n: number, m: number): string {
  const r = rng(seed);
  const perm = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = rint(r, 0, i); [perm[i], perm[j]] = [perm[j]!, perm[i]!]; }
  const e = Array.from({ length: m }, () => { const a = rint(r, 0, n - 2), b = rint(r, a + 1, n - 1); return `${perm[a]} ${perm[b]}`; });
  return `${n} ${m}\n${e.join("\n")}${m ? "\n" : ""}`;
}
problems.push({
  code: "Q122", slug: "topological-sort", title: "Topological Sort", difficulty: "Medium", topic: "Graphs",
  statement: "Given a directed acyclic graph, print a topological ordering of its vertices. Because many orderings can be valid, print the lexicographically smallest one: whenever several vertices are available, always pick the one with the smallest number.",
  inputFormat: "Line 1: n and m (vertices are 0..n-1, m directed edges).\nNext m lines: u v meaning u must come before v.",
  outputFormat: "The ordering of all n vertices separated by spaces.",
  constraints: "1 <= n <= 1000\n0 <= m <= 5000\nThe graph is guaranteed to be acyclic.",
  samples: [{ input: "4 4\n0 1\n0 2\n1 3\n2 3\n", output: "0 1 2 3" }],
  hidden: ["1 0\n", "3 0\n", "3 2\n2 1\n1 0\n", "5 4\n4 3\n3 2\n2 1\n1 0\n", "6 6\n5 2\n5 0\n4 0\n4 1\n2 3\n3 1\n", dagCase(122, 40, 80), dagCase(123, 300, 1500)],
  solve: (input) => {
    const l = rows(input); const [n, m] = ints(l[0]!) as [number, number];
    const adj = Array.from({ length: n }, () => [] as number[]); const indeg = new Array<number>(n).fill(0);
    for (let i = 1; i <= m; i++) { const [u, v] = ints(l[i]!) as [number, number]; adj[u]!.push(v); indeg[v]!++; }
    const ready: number[] = []; for (let i = 0; i < n; i++) if (indeg[i] === 0) ready.push(i);
    const order: number[] = [];
    while (ready.length) { ready.sort((a, b) => a - b); const u = ready.shift()!; order.push(u); for (const v of adj[u]!) if (--indeg[v]! === 0) ready.push(v); }
    return order.join(" ");
  },
});

export default problems;

/** Build the JavaScript starter template shown in the editor. */
export function starterCodeFor(p: Problem): string {
  const fmt = p.inputFormat.split("\n").map((line) => `// ${line}`).join("\n");
  return `// ${p.title}\n// Read the input from stdin and print the answer to stdout.\n//\n// Input format:\n${fmt}\n\nconst lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\n\n// Write your solution here\n\nconsole.log(/* your answer */);\n`;
}
