import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="heroBg" />
        <div className="heroInner">
          <h1 className="heroTitle">GUC B.Sc. Thesis Scheduler</h1>
          <p className="heroText">
            Upload data step by step, then generate the best possible defense schedule.
          </p>
          <div className="heroButtons">
            <Link href="/admin/upload-users" className="btn">
              Get Started
            </Link>
            <Link href="/schedule" className="btn btnLight">
              Generate Schedule
            </Link>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="section">
        <div className="container sectionInner">
          <h2 className="pageTitle">Step-by-Step Workflow</h2>
          <p className="text-gray-600 mb-6">
            Please follow this order when uploading data to ensure correct scheduling:
          </p>

          <ol className="list-decimal list-inside space-y-4">
            <li>
              <Link href="/admin/upload-users" className="btn btnDark">Upload Users</Link>  
              <p className="text-sm text-gray-600">Supervisors, reviewers, and examiners</p>
            </li>
            <li>
              <Link href="/admin/upload-topics" className="btn btnDark">Upload Topics</Link>  
              <p className="text-sm text-gray-600">Bachelor topics with supervisor & reviewer</p>
            </li>
            <li>
              <Link href="/admin/upload-rooms" className="btn btnDark">Upload Rooms</Link>  
              <p className="text-sm text-gray-600">Available rooms with capacity</p>
            </li>
            <li>
              <Link href="/admin/upload-timeslots" className="btn btnDark">Upload Timeslots</Link>  
              <p className="text-sm text-gray-600">Define date and time ranges</p>
            </li>
            <li>
              <Link href="/admin/user-dates" className="btn btnDark">Upload Unavailability</Link>  
              <p className="text-sm text-gray-600">Add User Constraints</p>
            </li>
            <li>
              <Link href="/schedule" className="btn btnDark">Generate Schedule</Link>  
              <p className="text-sm text-gray-600">Create, compare, and review schedules</p>
            </li>
          </ol>
        </div>
      </section>
    </>
  );
}
