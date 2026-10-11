import { starterCodeFor, type Problem } from "./coding-problems";

/** Languages every stdin/stdout problem supports. JavaScript runs on our server, the others via Judge0. */
export const PROGRAM_LANGUAGES = ["javascript", "python", "java", "cpp", "c", "csharp", "go", "rust", "kotlin", "typescript", "php", "ruby"] as const;

const comment = (prefix: string, title: string, inputFormat: string) =>
  [`${prefix} ${title}`, `${prefix} Read the input from stdin and print the answer to stdout.`, `${prefix}`, `${prefix} Input format:`, ...inputFormat.split("\n").map((l) => `${prefix} ${l}`)].join("\n");

/** Starter code for every language of a stdin/stdout problem. */
export function startersFor(p: Pick<Problem, "title" | "inputFormat"> & Partial<Problem>): Record<string, string> {
  const c = (prefix: string) => comment(prefix, p.title, p.inputFormat);
  return {
    javascript: starterCodeFor(p as Problem),
    python: `${c("#")}

import sys

data = sys.stdin.read().split('\\n')

# Write your solution here

print()
`,
    java: `${c("//")}

import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        String line = in.readLine();

        // Write your solution here

        System.out.println();
    }
}
`,
    cpp: `${c("//")}

#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Write your solution here

    return 0;
}
`,
    c: `${c("//")}

#include <stdio.h>

int main(void) {
    // Write your solution here

    return 0;
}
`,
    csharp: `${c("//")}

using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        string line = Console.ReadLine();

        // Write your solution here

        Console.WriteLine();
    }
}
`,
    go: `${c("//")}

package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	_ = reader

	// Write your solution here

	fmt.Println()
}
`,
    rust: `${c("//")}

use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();

    // Write your solution here

    println!();
}
`,
    kotlin: `${c("//")}

fun main() {
    val lines = generateSequence(::readLine).toList()

    // Write your solution here

    println()
}
`,
    typescript: `${c("//")}

declare const require: any;
const lines: string[] = require('fs').readFileSync(0, 'utf8').trim().split('\\n');

// Write your solution here

console.log();
`,
    php: `<?php
${c("//")}

$lines = explode("\\n", trim(stream_get_contents(STDIN)));

// Write your solution here

echo "\\n";
`,
    ruby: `${c("#")}

lines = STDIN.read.split("\\n")

# Write your solution here

puts
`,
  };
}
