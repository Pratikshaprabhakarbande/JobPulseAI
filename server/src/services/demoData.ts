import { Job, createId } from '../utils/types';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function getDemoJobs(): Job[] {
  const jobs: any[] = [
    {
      id: createId(),
      title: 'SOC Analyst Intern',
      company: 'CyberShield Technologies',
      location: 'Bengaluru, India',
      workMode: 'Hybrid',
      postedDate: hoursAgo(3),
      postedDateRelative: 'Posted 3 hours ago',
      url: 'https://example.com/jobs/soc-analyst-intern',
      source: 'Demo Data',
      experienceLevel: 'Internship / Fresher',
      salary: '₹15,000 - ₹25,000/month',
      description: `We are looking for a motivated SOC Analyst Intern to join our Security Operations Center team.

Responsibilities:
- Monitor security alerts and events using SIEM tools (Splunk, QRadar)
- Assist in incident response and investigation procedures
- Analyze network traffic and system logs for potential threats
- Document security incidents and create detailed reports
- Participate in vulnerability assessments and penetration testing exercises
- Collaborate with senior analysts on threat intelligence activities

Requirements:
- Currently pursuing B.E./B.Tech in Computer Science, IT, or Cybersecurity
- Understanding of networking concepts (TCP/IP, DNS, HTTP, firewalls)
- Basic knowledge of Linux and Windows operating systems
- Familiarity with Python scripting for security automation
- Knowledge of OWASP Top 10 and common cybersecurity frameworks
- Good analytical and problem-solving skills

Nice to Have:
- Experience with SIEM tools (Splunk, QRadar, ELK)
- Knowledge of cloud security (AWS/Azure)
- Any cybersecurity certifications (CompTIA Security+, CEH)
- Experience with Wireshark, Nmap, or Burp Suite
- Contributions to CTF competitions or cybersecurity projects`,
      requiredSkills: ['Python', 'Linux', 'Networking', 'SIEM', 'TCP/IP', 'Incident Response', 'Log Analysis'],
      preferredSkills: ['Splunk', 'QRadar', 'AWS', 'Wireshark', 'Nmap', 'Burp Suite', 'CompTIA Security+'],
      isDemo: true,
      createdAt: hoursAgo(3),
    },
    {
      id: createId(),
      title: 'Junior Software Engineer',
      company: 'TechNova Solutions',
      location: 'Hyderabad, India',
      workMode: 'On-site',
      postedDate: hoursAgo(5),
      postedDateRelative: 'Posted 5 hours ago',
      url: 'https://example.com/jobs/junior-software-engineer',
      source: 'Demo Data',
      experienceLevel: 'Fresher / 0-1 years',
      salary: '₹4,00,000 - ₹6,00,000/year',
      description: `TechNova Solutions is hiring a Junior Software Engineer to work on cutting-edge web applications.

Responsibilities:
- Develop and maintain web applications using React and Node.js
- Write clean, maintainable, and well-documented code
- Participate in code reviews and team standups
- Debug and fix software defects
- Collaborate with designers and product managers
- Write unit and integration tests

Requirements:
- B.E./B.Tech in Computer Science or related field
- Strong fundamentals in Data Structures and Algorithms
- Proficiency in JavaScript/TypeScript
- Experience with React.js or similar frontend frameworks
- Knowledge of Node.js and Express.js
- Familiarity with Git version control
- Understanding of RESTful APIs
- Knowledge of SQL and NoSQL databases

Nice to Have:
- Experience with MongoDB, PostgreSQL
- Knowledge of Docker and CI/CD
- Exposure to cloud platforms (AWS, GCP, Azure)
- Understanding of Agile/Scrum methodologies`,
      requiredSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Express.js', 'Git', 'REST APIs', 'DSA'],
      preferredSkills: ['MongoDB', 'PostgreSQL', 'Docker', 'CI/CD', 'AWS', 'Agile'],
      isDemo: true,
      createdAt: hoursAgo(5),
    },
    {
      id: createId(),
      title: 'Full Stack Developer Intern',
      company: 'InnovateTech Labs',
      location: 'Pune, India',
      workMode: 'Remote',
      postedDate: hoursAgo(8),
      postedDateRelative: 'Posted 8 hours ago',
      url: 'https://example.com/jobs/fullstack-developer-intern',
      source: 'Demo Data',
      experienceLevel: 'Internship',
      salary: '₹20,000 - ₹30,000/month',
      description: `Join our dynamic team as a Full Stack Developer Intern and work on real-world products.

Responsibilities:
- Build responsive user interfaces using React.js and Tailwind CSS
- Develop RESTful APIs using Node.js and Express
- Work with MongoDB for database design and management
- Implement authentication and authorization features
- Deploy applications using Docker and cloud platforms
- Participate in agile sprints and daily standups

Requirements:
- Currently pursuing or recently completed B.E./B.Tech in CS/IT
- Strong knowledge of MERN stack (MongoDB, Express, React, Node.js)
- Proficiency in HTML, CSS, JavaScript, and TypeScript
- Understanding of responsive design principles
- Familiarity with Git and GitHub
- Strong problem-solving abilities

Nice to Have:
- Experience with Next.js or similar frameworks
- Knowledge of GraphQL
- Understanding of DevOps principles
- Portfolio of personal or academic projects
- Contributions to open-source projects`,
      requiredSkills: ['MongoDB', 'Express.js', 'React', 'Node.js', 'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Git'],
      preferredSkills: ['Next.js', 'GraphQL', 'Docker', 'Tailwind CSS', 'DevOps'],
      isDemo: true,
      createdAt: hoursAgo(8),
    },
    {
      id: createId(),
      title: 'Cloud Security Intern',
      company: 'SecureCloud Inc.',
      location: 'Mumbai, India',
      workMode: 'Hybrid',
      postedDate: hoursAgo(14),
      postedDateRelative: 'Posted 14 hours ago',
      url: 'https://example.com/jobs/cloud-security-intern',
      source: 'Demo Data',
      experienceLevel: 'Internship',
      salary: '₹18,000 - ₹28,000/month',
      description: `SecureCloud Inc. is looking for a Cloud Security Intern to assist in securing cloud infrastructure.

Responsibilities:
- Assist in cloud security assessments for AWS and Azure environments
- Monitor cloud infrastructure for security threats and vulnerabilities
- Help implement security best practices and compliance standards
- Conduct security audits and document findings
- Support the team in implementing IAM policies and security groups
- Research emerging cloud security threats and trends

Requirements:
- Pursuing B.E./B.Tech in Computer Science, Cybersecurity, or related field
- Basic understanding of cloud platforms (AWS/Azure/GCP)
- Knowledge of networking and security fundamentals
- Familiarity with Linux command line
- Understanding of encryption and identity management concepts
- Good written and verbal communication skills

Nice to Have:
- AWS Cloud Practitioner or Azure Fundamentals certification
- Experience with Terraform or CloudFormation
- Knowledge of container security (Docker, Kubernetes)
- Understanding of compliance frameworks (SOC 2, ISO 27001)
- Experience with scripting (Python, Bash)`,
      requiredSkills: ['AWS', 'Azure', 'Networking', 'Linux', 'Security', 'IAM', 'Cloud Computing'],
      preferredSkills: ['Terraform', 'Docker', 'Kubernetes', 'Python', 'Bash', 'SOC 2', 'ISO 27001'],
      isDemo: true,
      createdAt: hoursAgo(14),
    },
    {
      id: createId(),
      title: 'DevSecOps Intern',
      company: 'Fortress Digital',
      location: 'Delhi NCR, India',
      workMode: 'On-site',
      postedDate: hoursAgo(22),
      postedDateRelative: 'Posted 22 hours ago',
      url: 'https://example.com/jobs/devsecops-intern',
      source: 'Demo Data',
      experienceLevel: 'Internship / Entry Level',
      salary: '₹20,000 - ₹35,000/month',
      description: `Fortress Digital is seeking a DevSecOps Intern to integrate security practices into our CI/CD pipelines.

Responsibilities:
- Help integrate security testing tools into CI/CD pipelines
- Conduct static and dynamic application security testing (SAST/DAST)
- Assist in container security scanning and image hardening
- Monitor application vulnerabilities and track remediation
- Create documentation for security processes and procedures
- Support infrastructure as code security reviews

Requirements:
- Pursuing/completed B.E./B.Tech in CS, IT, or related field
- Understanding of CI/CD concepts (Jenkins, GitHub Actions, GitLab CI)
- Basic knowledge of Docker and containerization
- Familiarity with at least one programming language (Python, Go, Java)
- Understanding of OWASP Top 10 vulnerabilities
- Knowledge of version control with Git

Nice to Have:
- Experience with Kubernetes
- Knowledge of infrastructure as code (Terraform, Ansible)
- Experience with SAST/DAST tools (SonarQube, OWASP ZAP)
- Understanding of secrets management
- Cloud security certifications or coursework`,
      requiredSkills: ['CI/CD', 'Docker', 'Git', 'Python', 'OWASP', 'Security Testing', 'Linux'],
      preferredSkills: ['Kubernetes', 'Terraform', 'Ansible', 'SonarQube', 'Jenkins', 'GitHub Actions'],
      isDemo: true,
      createdAt: hoursAgo(22),
    },
    {
      id: createId(),
      title: 'Cybersecurity Analyst - Entry Level',
      company: 'Guardian InfoSec',
      location: 'Bengaluru, India',
      workMode: 'On-site',
      postedDate: hoursAgo(28),
      postedDateRelative: 'Posted 1 day ago',
      url: 'https://example.com/jobs/cybersecurity-analyst',
      source: 'Demo Data',
      experienceLevel: 'Entry Level / 0-2 years',
      salary: '₹3,50,000 - ₹5,50,000/year',
      description: `Guardian InfoSec is hiring an entry-level Cybersecurity Analyst to strengthen our security team.

Responsibilities:
- Monitor and analyze security events and incidents
- Perform vulnerability assessments and penetration testing
- Investigate security breaches and recommend corrective actions
- Maintain and update security monitoring tools
- Develop security awareness training materials
- Create security reports and documentation

Requirements:
- B.E./B.Tech in Computer Science, Cybersecurity, or related field
- Understanding of cybersecurity principles and frameworks (NIST, ISO 27001)
- Knowledge of networking protocols and firewalls
- Proficiency in at least one scripting language (Python, Bash, PowerShell)
- Familiarity with vulnerability scanning tools
- Strong analytical thinking skills

Nice to Have:
- CompTIA Security+ or CEH certification
- Experience with penetration testing tools (Metasploit, Burp Suite)
- Knowledge of SIEM platforms
- Understanding of malware analysis basics
- Bug bounty or CTF participation`,
      requiredSkills: ['Cybersecurity', 'Networking', 'Python', 'Vulnerability Assessment', 'NIST', 'Firewalls'],
      preferredSkills: ['Metasploit', 'Burp Suite', 'SIEM', 'CEH', 'CompTIA Security+', 'Malware Analysis'],
      isDemo: true,
      createdAt: hoursAgo(28),
    },
    {
      id: createId(),
      title: 'MERN Stack Developer',
      company: 'WebCraft Studios',
      location: 'Remote, India',
      workMode: 'Remote',
      postedDate: hoursAgo(36),
      postedDateRelative: 'Posted 1.5 days ago',
      url: 'https://example.com/jobs/mern-developer',
      source: 'Demo Data',
      experienceLevel: 'Fresher / 0-1 years',
      salary: '₹3,00,000 - ₹5,00,000/year',
      description: `WebCraft Studios is looking for a passionate MERN Stack Developer to build web applications.

Responsibilities:
- Build full-stack web applications using MERN stack
- Create responsive UIs with React.js and modern CSS frameworks
- Design and implement RESTful APIs with Node.js and Express
- Manage databases with MongoDB and Mongoose
- Implement user authentication and authorization
- Write clean, tested, and maintainable code

Requirements:
- B.E./B.Tech or equivalent in Computer Science
- Strong proficiency in MongoDB, Express.js, React.js, and Node.js
- Good understanding of JavaScript ES6+ and TypeScript
- Experience with state management (Redux, Context API)
- Knowledge of HTML5, CSS3, and responsive design
- Understanding of Git workflow

Nice to Have:
- Knowledge of Next.js or Gatsby
- Experience with testing frameworks (Jest, React Testing Library)
- Understanding of WebSocket and real-time applications
- Knowledge of cloud deployment (Vercel, Netlify, AWS)
- Experience with Figma or design tools`,
      requiredSkills: ['MongoDB', 'Express.js', 'React', 'Node.js', 'JavaScript', 'TypeScript', 'Redux', 'HTML', 'CSS'],
      preferredSkills: ['Next.js', 'Jest', 'WebSocket', 'AWS', 'Vercel', 'Figma'],
      isDemo: true,
      createdAt: hoursAgo(36),
    },
    {
      id: createId(),
      title: 'Python Backend Developer',
      company: 'DataFlow Systems',
      location: 'Chennai, India',
      workMode: 'Hybrid',
      postedDate: hoursAgo(48),
      postedDateRelative: 'Posted 2 days ago',
      url: 'https://example.com/jobs/python-backend-dev',
      source: 'Demo Data',
      experienceLevel: 'Entry Level / 0-2 years',
      salary: '₹4,50,000 - ₹7,00,000/year',
      description: `DataFlow Systems is hiring a Python Backend Developer to build scalable data-driven applications.

Responsibilities:
- Develop backend services and APIs using Python and Django/Flask
- Design and optimize database schemas
- Build data processing pipelines
- Implement caching and performance optimizations
- Write comprehensive unit and integration tests
- Collaborate with frontend developers and data scientists

Requirements:
- B.E./B.Tech in Computer Science or related field
- Strong proficiency in Python 3.x
- Experience with Django or Flask web frameworks
- Knowledge of SQL databases (PostgreSQL, MySQL)
- Understanding of REST API design principles
- Familiarity with Git version control

Nice to Have:
- Experience with FastAPI
- Knowledge of Redis, RabbitMQ, or Celery
- Understanding of Docker and containerization
- Experience with cloud services (AWS, GCP)
- Knowledge of data structures and algorithms`,
      requiredSkills: ['Python', 'Django', 'Flask', 'PostgreSQL', 'SQL', 'REST APIs', 'Git'],
      preferredSkills: ['FastAPI', 'Redis', 'Docker', 'AWS', 'RabbitMQ', 'Celery'],
      isDemo: true,
      createdAt: hoursAgo(48),
    },
    {
      id: createId(),
      title: 'Cloud Engineer - Fresher',
      company: 'NimbusOps Technologies',
      location: 'Noida, India',
      workMode: 'On-site',
      postedDate: hoursAgo(60),
      postedDateRelative: 'Posted 2.5 days ago',
      url: 'https://example.com/jobs/cloud-engineer',
      source: 'Demo Data',
      experienceLevel: 'Fresher',
      salary: '₹4,00,000 - ₹6,50,000/year',
      description: `NimbusOps Technologies is hiring a Cloud Engineer (Fresher) to join our cloud infrastructure team.

Responsibilities:
- Assist in designing and maintaining cloud infrastructure on AWS
- Help automate infrastructure provisioning using Terraform
- Support CI/CD pipeline implementation and maintenance
- Monitor cloud resources and optimize costs
- Assist in implementing security best practices
- Document cloud architecture and procedures

Requirements:
- B.E./B.Tech in Computer Science, IT, or related field
- Basic knowledge of AWS services (EC2, S3, RDS, Lambda, VPC)
- Understanding of Linux system administration
- Familiarity with scripting languages (Python, Bash)
- Knowledge of networking concepts
- Eagerness to learn and grow

Nice to Have:
- AWS Cloud Practitioner certification
- Experience with Terraform or CloudFormation
- Knowledge of Docker and Kubernetes
- Understanding of CI/CD tools
- Experience with monitoring tools (CloudWatch, Prometheus)`,
      requiredSkills: ['AWS', 'Linux', 'Python', 'Bash', 'Networking', 'Cloud Computing'],
      preferredSkills: ['Terraform', 'Docker', 'Kubernetes', 'CloudFormation', 'Prometheus', 'CI/CD'],
      isDemo: true,
      createdAt: hoursAgo(60),
    },
    {
      id: createId(),
      title: 'Application Security Engineer Intern',
      company: 'SecureTech Labs',
      location: 'Bengaluru, India',
      workMode: 'Remote',
      postedDate: hoursAgo(72),
      postedDateRelative: 'Posted 3 days ago',
      url: 'https://example.com/jobs/appsec-intern',
      source: 'Demo Data',
      experienceLevel: 'Internship',
      salary: '₹15,000 - ₹25,000/month',
      description: `SecureTech Labs is looking for an Application Security Engineer Intern.

Responsibilities:
- Perform web application security testing
- Conduct code reviews for security vulnerabilities
- Use OWASP testing methodology for security assessments
- Document vulnerabilities and provide remediation guidance
- Support the development of security testing automation
- Research new attack vectors and security trends

Requirements:
- Pursuing B.E./B.Tech in CS, IT, or Cybersecurity
- Understanding of OWASP Top 10 and web security concepts
- Knowledge of HTTP protocol and web technologies
- Basic programming skills (Python, JavaScript)
- Familiarity with security testing tools
- Strong attention to detail

Nice to Have:
- Experience with Burp Suite Professional
- Knowledge of secure coding practices
- Bug bounty experience
- Understanding of API security
- OSCP or similar certification in progress`,
      requiredSkills: ['OWASP', 'Web Security', 'Python', 'JavaScript', 'HTTP', 'Security Testing'],
      preferredSkills: ['Burp Suite', 'API Security', 'Secure Coding', 'OSCP'],
      isDemo: true,
      createdAt: hoursAgo(72),
    },
    {
      id: createId(),
      title: 'Network Security Engineer - Entry Level',
      company: 'NetDefend Corp',
      location: 'Gurgaon, India',
      workMode: 'On-site',
      postedDate: hoursAgo(96),
      postedDateRelative: 'Posted 4 days ago',
      url: 'https://example.com/jobs/network-security',
      source: 'Demo Data',
      experienceLevel: 'Entry Level / 0-1 years',
      salary: '₹3,50,000 - ₹5,00,000/year',
      description: `NetDefend Corp is hiring an entry-level Network Security Engineer.

Responsibilities:
- Configure and manage firewalls, IDS/IPS systems
- Monitor network traffic for suspicious activity
- Assist in network vulnerability assessments
- Maintain VPN and access control systems
- Document network security policies
- Support incident response activities

Requirements:
- B.E./B.Tech in Computer Science, Networking, or IT
- Understanding of TCP/IP, DNS, DHCP, HTTP/HTTPS protocols
- Knowledge of firewall concepts and network security
- Basic understanding of routing and switching
- Familiarity with Linux and Windows server administration
- Good communication and teamwork skills

Nice to Have:
- CCNA or CompTIA Network+ certification
- Experience with Cisco, Palo Alto, or Fortinet firewalls
- Knowledge of Wireshark and packet analysis
- Understanding of Zero Trust architecture
- Experience with network monitoring tools`,
      requiredSkills: ['Networking', 'TCP/IP', 'Firewalls', 'Linux', 'Windows Server', 'DNS', 'IDS/IPS'],
      preferredSkills: ['CCNA', 'Cisco', 'Palo Alto', 'Wireshark', 'Zero Trust', 'VPN'],
      isDemo: true,
      createdAt: hoursAgo(96),
    },
    {
      id: createId(),
      title: 'Java Developer - Fresher',
      company: 'CoreLogic Systems',
      location: 'Pune, India',
      workMode: 'On-site',
      postedDate: hoursAgo(110),
      postedDateRelative: 'Posted 4.5 days ago',
      url: 'https://example.com/jobs/java-developer',
      source: 'Demo Data',
      experienceLevel: 'Fresher',
      salary: '₹3,50,000 - ₹5,50,000/year',
      description: `CoreLogic Systems is looking for a Java Developer (Fresher) to join our backend engineering team.

Responsibilities:
- Develop backend services using Java and Spring Boot
- Design and implement RESTful APIs
- Work with relational databases (MySQL, PostgreSQL)
- Write unit tests and participate in code reviews
- Follow agile development practices
- Collaborate with cross-functional teams

Requirements:
- B.E./B.Tech in Computer Science or related field
- Strong proficiency in Core Java and OOP concepts
- Knowledge of Spring Boot framework
- Understanding of SQL and database design
- Knowledge of data structures and algorithms
- Familiarity with Git

Nice to Have:
- Experience with Hibernate/JPA
- Knowledge of microservices architecture
- Understanding of Docker and Kubernetes
- Experience with message queues (Kafka, RabbitMQ)
- Knowledge of Maven or Gradle`,
      requiredSkills: ['Java', 'Spring Boot', 'SQL', 'OOP', 'REST APIs', 'Git', 'DSA'],
      preferredSkills: ['Hibernate', 'Microservices', 'Docker', 'Kubernetes', 'Kafka', 'Maven'],
      isDemo: true,
      createdAt: hoursAgo(110),
    },
    {
      id: createId(),
      title: 'Frontend Developer',
      company: 'PixelPerfect Design Co.',
      location: 'Remote, India',
      workMode: 'Remote',
      postedDate: hoursAgo(130),
      postedDateRelative: 'Posted 5 days ago',
      url: 'https://example.com/jobs/frontend-developer',
      source: 'Demo Data',
      experienceLevel: 'Fresher / 0-1 years',
      salary: '₹3,00,000 - ₹4,50,000/year',
      description: `PixelPerfect Design Co. is seeking a Frontend Developer to create beautiful user interfaces.

Responsibilities:
- Build responsive web applications using React.js
- Implement pixel-perfect designs from Figma mockups
- Optimize application performance and user experience
- Write reusable components with TypeScript
- Implement state management solutions
- Ensure cross-browser compatibility

Requirements:
- B.E./B.Tech or relevant degree
- Strong proficiency in HTML5, CSS3, JavaScript
- Experience with React.js and component-based architecture
- Knowledge of TypeScript
- Understanding of responsive design and CSS frameworks
- Familiarity with Git version control

Nice to Have:
- Experience with Tailwind CSS or styled-components
- Knowledge of Next.js
- Understanding of web accessibility (WCAG)
- Experience with animation libraries (Framer Motion)
- Portfolio of frontend projects`,
      requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Responsive Design', 'Git'],
      preferredSkills: ['Tailwind CSS', 'Next.js', 'WCAG', 'Framer Motion', 'Figma'],
      isDemo: true,
      createdAt: hoursAgo(130),
    },
    {
      id: createId(),
      title: 'DevOps Engineer Intern',
      company: 'CloudScale Ops',
      location: 'Hyderabad, India',
      workMode: 'Hybrid',
      postedDate: hoursAgo(150),
      postedDateRelative: 'Posted 6 days ago',
      url: 'https://example.com/jobs/devops-intern',
      source: 'Demo Data',
      experienceLevel: 'Internship',
      salary: '₹18,000 - ₹30,000/month',
      description: `CloudScale Ops is looking for a DevOps Engineer Intern to help automate and improve our infrastructure.

Responsibilities:
- Assist in building and maintaining CI/CD pipelines
- Help manage cloud infrastructure on AWS/GCP
- Support containerization of applications using Docker
- Monitor system health and performance
- Automate repetitive tasks using scripts
- Document infrastructure and deployment procedures

Requirements:
- Pursuing B.E./B.Tech in CS, IT, or related field
- Understanding of CI/CD concepts
- Basic knowledge of Docker containerization
- Familiarity with Linux command line
- Knowledge of at least one scripting language (Python, Bash)
- Understanding of version control with Git

Nice to Have:
- Experience with Kubernetes
- Knowledge of Terraform or Ansible
- Understanding of monitoring tools (Grafana, Prometheus)
- AWS or GCP cloud experience
- Knowledge of Jenkins or GitHub Actions`,
      requiredSkills: ['CI/CD', 'Docker', 'Linux', 'Python', 'Bash', 'Git', 'Cloud Computing'],
      preferredSkills: ['Kubernetes', 'Terraform', 'Ansible', 'Grafana', 'Prometheus', 'Jenkins'],
      isDemo: true,
      createdAt: hoursAgo(150),
    },
    {
      id: createId(),
      title: 'Penetration Tester - Junior',
      company: 'RedTeam Security',
      location: 'Bengaluru, India',
      workMode: 'On-site',
      postedDate: hoursAgo(170),
      postedDateRelative: 'Posted 7 days ago',
      url: 'https://example.com/jobs/pentester-junior',
      source: 'Demo Data',
      experienceLevel: 'Junior / 0-1 years',
      salary: '₹4,00,000 - ₹6,00,000/year',
      description: `RedTeam Security is hiring a Junior Penetration Tester to join our offensive security team.

Responsibilities:
- Perform web application and network penetration testing
- Identify and document security vulnerabilities
- Write detailed penetration testing reports
- Assist in red team operations
- Research new exploitation techniques
- Support vulnerability remediation efforts

Requirements:
- B.E./B.Tech in Computer Science, Cybersecurity, or related field
- Understanding of penetration testing methodologies (OWASP, PTES)
- Knowledge of common vulnerabilities (SQL injection, XSS, CSRF)
- Experience with Kali Linux and security testing tools
- Basic scripting ability (Python, Bash)
- Strong ethical mindset and attention to detail

Nice to Have:
- CEH, OSCP, or eJPT certification
- Bug bounty experience
- Experience with Metasploit, Burp Suite
- Knowledge of Active Directory security
- CTF competition experience`,
      requiredSkills: ['Penetration Testing', 'OWASP', 'Kali Linux', 'Python', 'SQL Injection', 'XSS', 'Networking'],
      preferredSkills: ['CEH', 'OSCP', 'Metasploit', 'Burp Suite', 'Active Directory', 'CTF'],
      isDemo: true,
      createdAt: hoursAgo(170),
    },
  ];

  return jobs.map(j => ({
    ...j,
    applyUrl: j.url,
    source: 'Demo Data (Test Mode)',
    isDemo: true,
  }));
}
