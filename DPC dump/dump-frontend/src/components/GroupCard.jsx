import { Link } from "react-router-dom";

function GroupCard({ group }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="group-card"
    >
      <div className="group-image">
        <span>{group.icon}</span>
      </div>

      <div className="group-details">
        <h2>{group.name}</h2>
        <p>{group.description}</p>

        <span className="group-link">
          view group →
        </span>
      </div>
    </Link>
  );
}

export default GroupCard;
