import { apiResponse } from "@/lib/api/response"

const profileData = {
  name: "Shashwat Jain",
  title: "AI & Backend Engineer",
  location: "India",
  bio: "AI & Backend Engineer building intelligent systems. Passionate about machine learning, scalable architectures, and research.",
  links: {
    github: "https://github.com/shashwatjain",
    twitter: "https://x.com/shashwatjain",
    linkedin: "https://linkedin.com/in/shashwatjain",
    email: "shashwat@example.com",
  },
  available: true,
}

export async function GET() {
  return apiResponse(profileData)
}
