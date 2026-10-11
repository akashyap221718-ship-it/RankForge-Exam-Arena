/**
 * SQL problems. The learner writes one SELECT query; the judge builds each dataset in an in-memory
 * SQLite database, runs the query, and compares the result rows with the reference query's rows.
 * The first dataset is shown as the example, the rest are hidden tests. Expected rows are produced
 * by running `reference` at seed time, so they are never typed by hand.
 */

export type SqlProblem = {
  code: string;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  statement: string;
  outputFormat: string;
  constraints: string;
  datasets: string[]; // setup scripts; datasets[0] is the visible example
  reference: string;
  ordered: boolean; // true when the statement fixes an ORDER BY
};

const sqlValue = (v: string | number | null) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);
const table = (ddl: string, name: string, rows: (string | number | null)[][]) =>
  `${ddl};\n${rows.length ? `INSERT INTO ${name} VALUES ${rows.map((r) => `(${r.map(sqlValue).join(", ")})`).join(", ")};` : ""}`;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)]!;

const EMPLOYEE = "CREATE TABLE Employee (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER)";
const employees = (rows: [number, string, number][]) => table(EMPLOYEE, "Employee", rows);

const EMP_DEPT = "CREATE TABLE Employee (id INTEGER PRIMARY KEY, department TEXT, salary INTEGER)";
const empDept = (rows: [number, string, number][]) => table(EMP_DEPT, "Employee", rows);

const DEPT = "CREATE TABLE Department (id INTEGER PRIMARY KEY, name TEXT)";
const EMP2 = "CREATE TABLE Employee (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, department_id INTEGER)";
const company = (depts: [number, string][], emps: [number, string, number, number][]) => `${table(DEPT, "Department", depts)}\n${table(EMP2, "Employee", emps)}`;

function randomCompany(seed: number, people: number): string {
  const r = rng(seed);
  const depts: [number, string][] = [[1, "Engineering"], [2, "Sales"], [3, "HR"], [4, "Support"]];
  const emps: [number, string, number, number][] = Array.from({ length: people }, (_, i) => [i + 1, `Emp${String(i + 1).padStart(2, "0")}`, pick(r, [40, 50, 60, 70, 80, 90, 100]) * 1000, pick(r, [1, 2, 3, 4])]);
  return company(depts, emps);
}

const problems: SqlProblem[] = [
  {
    code: "Q111", slug: "sql-second-highest-salary", title: "Second Highest Salary", difficulty: "Easy", topic: "SQL",
    statement: "Table: Employee(id, name, salary)\n\nWrite a query that returns the second highest distinct salary. If there is no second highest salary, return NULL.",
    outputFormat: "One row with one column named SecondHighestSalary.",
    constraints: "Salaries can repeat. The table can have a single row.",
    datasets: [
      employees([[1, "A", 100], [2, "B", 200], [3, "C", 300]]),
      employees([[1, "A", 100]]),
      employees([[1, "A", 300], [2, "B", 300], [3, "C", 200]]),
      employees([[1, "A", 50], [2, "B", 50], [3, "C", 50]]),
      employees([[1, "A", 10], [2, "B", 90], [3, "C", 70], [4, "D", 90], [5, "E", 5]]),
    ],
    reference: "SELECT (SELECT DISTINCT salary FROM Employee ORDER BY salary DESC LIMIT 1 OFFSET 1) AS SecondHighestSalary",
    ordered: false,
  },
  {
    code: "Q112", slug: "sql-departments-high-average", title: "Departments with High Average Salary", difficulty: "Medium", topic: "SQL",
    statement: "Table: Employee(id, department, salary)\n\nReturn every department whose average salary is strictly greater than 50000.",
    outputFormat: "One column named department. Sort the rows by department in ascending order.",
    constraints: "An average of exactly 50000 does not count.",
    datasets: [
      empDept([[1, "Engineering", 60000], [2, "Engineering", 70000], [3, "HR", 40000], [4, "HR", 30000], [5, "Sales", 50000]]),
      empDept([[1, "Ops", 90000]]),
      empDept([[1, "A", 10000], [2, "B", 20000]]),
      empDept([[1, "X", 50001], [2, "X", 50000], [3, "Y", 49999], [4, "Y", 50001], [5, "Z", 40000], [6, "Z", 60001]]),
    ],
    reference: "SELECT department FROM Employee GROUP BY department HAVING AVG(salary) > 50000 ORDER BY department",
    ordered: true,
  },
  {
    code: "Q113", slug: "sql-above-average-earners", title: "Employees Earning Above Average", difficulty: "Medium", topic: "SQL",
    statement: "Table: Employee(id, name, salary)\n\nReturn the names of employees who earn more than the average salary of all employees.",
    outputFormat: "One column named name. Sort the rows by name in ascending order.",
    constraints: "The average is taken over the whole table, not per department.",
    datasets: [
      employees([[1, "A", 30000], [2, "B", 50000], [3, "C", 70000]]),
      employees([[1, "A", 100], [2, "B", 100], [3, "C", 100]]),
      employees([[1, "Zed", 10], [2, "Amy", 100], [3, "Bob", 90], [4, "Cat", 20]]),
      employees(Array.from({ length: 40 }, (_, i) => [i + 1, `P${String(i + 1).padStart(2, "0")}`, ((i * 37) % 23) * 1000] as [number, string, number])),
    ],
    reference: "SELECT name FROM Employee WHERE salary > (SELECT AVG(salary) FROM Employee) ORDER BY name",
    ordered: true,
  },
  {
    code: "Q115", slug: "sql-duplicate-emails", title: "Duplicate Emails", difficulty: "Easy", topic: "SQL",
    statement: "Table: Person(id, email)\n\nReturn every email address that appears more than once. Comparison is case-sensitive.",
    outputFormat: "One column named email, each duplicated email once. Sort the rows by email in ascending order.",
    constraints: "Emails are never NULL.",
    datasets: [
      table("CREATE TABLE Person (id INTEGER PRIMARY KEY, email TEXT)", "Person", [[1, "a@x.com"], [2, "b@x.com"], [3, "a@x.com"]]),
      table("CREATE TABLE Person (id INTEGER PRIMARY KEY, email TEXT)", "Person", [[1, "solo@x.com"]]),
      table("CREATE TABLE Person (id INTEGER PRIMARY KEY, email TEXT)", "Person", [[1, "z@x.com"], [2, "z@x.com"], [3, "z@x.com"], [4, "m@x.com"], [5, "m@x.com"], [6, "q@x.com"]]),
      table("CREATE TABLE Person (id INTEGER PRIMARY KEY, email TEXT)", "Person", [[1, "A@x.com"], [2, "a@x.com"], [3, "a@x.com"]]),
    ],
    reference: "SELECT email FROM Person GROUP BY email HAVING COUNT(*) > 1 ORDER BY email",
    ordered: true,
  },
  {
    code: "Q116", slug: "sql-customers-never-ordered", title: "Customers Who Never Ordered", difficulty: "Easy", topic: "SQL",
    statement: "Tables: Customers(id, name) and Orders(id, customer_id)\n\nReturn the names of customers who have not placed any order.",
    outputFormat: "One column named name. Sort the rows by name in ascending order.",
    constraints: "Orders.customer_id refers to Customers.id.",
    datasets: [
      `${table("CREATE TABLE Customers (id INTEGER PRIMARY KEY, name TEXT)", "Customers", [[1, "Joe"], [2, "Henry"], [3, "Sam"], [4, "Max"]])}\n${table("CREATE TABLE Orders (id INTEGER PRIMARY KEY, customer_id INTEGER)", "Orders", [[1, 3], [2, 1]])}`,
      `${table("CREATE TABLE Customers (id INTEGER PRIMARY KEY, name TEXT)", "Customers", [[1, "Ann"]])}\n${table("CREATE TABLE Orders (id INTEGER PRIMARY KEY, customer_id INTEGER)", "Orders", [])}`,
      `${table("CREATE TABLE Customers (id INTEGER PRIMARY KEY, name TEXT)", "Customers", [[1, "Ann"], [2, "Bo"]])}\n${table("CREATE TABLE Orders (id INTEGER PRIMARY KEY, customer_id INTEGER)", "Orders", [[1, 1], [2, 2], [3, 1]])}`,
      `${table("CREATE TABLE Customers (id INTEGER PRIMARY KEY, name TEXT)", "Customers", [[1, "Zoe"], [2, "Yan"], [3, "Xia"], [4, "Wes"]])}\n${table("CREATE TABLE Orders (id INTEGER PRIMARY KEY, customer_id INTEGER)", "Orders", [[1, 2], [2, 2], [3, 4]])}`,
    ],
    reference: "SELECT c.name AS name FROM Customers c LEFT JOIN Orders o ON o.customer_id = c.id WHERE o.id IS NULL ORDER BY c.name",
    ordered: true,
  },
  {
    code: "Q119", slug: "sql-department-top-earners", title: "Top Earner in Each Department", difficulty: "Medium", topic: "SQL",
    statement: "Tables: Department(id, name) and Employee(id, name, salary, department_id)\n\nFor every department, return the employee(s) with the highest salary in that department. If several employees tie for the highest salary, return all of them.",
    outputFormat: "Columns Department, Employee, Salary. Sort by Department, then Employee, both ascending.",
    constraints: "Departments with no employees are not returned.",
    datasets: [
      company([[1, "IT"], [2, "Sales"]], [[1, "Joe", 70000, 1], [2, "Jim", 90000, 1], [3, "Henry", 80000, 2], [4, "Sam", 60000, 2], [5, "Max", 90000, 1]]),
      company([[1, "IT"]], [[1, "Solo", 100, 1]]),
      company([[1, "IT"], [2, "Empty"], [3, "Ops"]], [[1, "Ann", 5, 1], [2, "Bob", 5, 1], [3, "Cy", 9, 3]]),
      randomCompany(119, 30),
    ],
    reference: "SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary FROM Employee e JOIN Department d ON d.id = e.department_id WHERE e.salary = (SELECT MAX(salary) FROM Employee WHERE department_id = e.department_id) ORDER BY Department, Employee",
    ordered: true,
  },
  {
    code: "Q125", slug: "sql-top-three-salaries", title: "Top Three Salaries per Department", difficulty: "Hard", topic: "SQL",
    statement: "Tables: Department(id, name) and Employee(id, name, salary, department_id)\n\nReturn the employees whose salary is one of the three highest distinct salaries in their department. Employees with the same salary share a rank, so more than three people can be returned for a department.",
    outputFormat: "Columns Department, Employee, Salary. Sort by Department ascending, then Salary descending, then Employee ascending.",
    constraints: "Window functions such as DENSE_RANK() are available.",
    datasets: [
      company([[1, "IT"], [2, "Sales"]], [[1, "Joe", 85000, 1], [2, "Henry", 80000, 2], [3, "Sam", 60000, 2], [4, "Max", 90000, 1], [5, "Janet", 69000, 1], [6, "Randy", 85000, 1], [7, "Will", 70000, 1]]),
      company([[1, "IT"]], [[1, "A", 10, 1], [2, "B", 20, 1]]),
      company([[1, "IT"], [2, "HR"]], [[1, "A", 10, 1], [2, "B", 10, 1], [3, "C", 10, 1], [4, "D", 10, 1], [5, "E", 5, 2]]),
      randomCompany(125, 40),
      randomCompany(126, 60),
    ],
    reference: "SELECT Department, Employee, Salary FROM (SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary, DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS r FROM Employee e JOIN Department d ON d.id = e.department_id) WHERE r <= 3 ORDER BY Department, Salary DESC, Employee",
    ordered: true,
  },
];

export default problems;

export const SQL_INPUT_FORMAT = "The tables are created and filled with test data before your query runs.\nWrite one read-only SELECT query (it may start with WITH).";

export function sqlStarter(p: SqlProblem): string {
  return `-- ${p.title}\n-- Write ONE read-only SELECT query. It may start with WITH.\n--\n${p.statement.split("\n").filter((l) => l.startsWith("Table")).map((l) => `-- ${l}`).join("\n")}\n\nSELECT\n`;
}
