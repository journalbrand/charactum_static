"""Graph Statistics Analyzer"""
from typing import Dict
from pydantic import BaseModel

from .database import OntorumDB

class GraphStats(BaseModel):
    total_nodes: int
    total_relationships: int
    average_degree: float
    node_type_distribution: Dict[str, int]
    relationship_type_distribution: Dict[str, int]

class GraphStatsAnalyzer:
    """Compute overall graph statistics using Neo4j."""
    def __init__(self, db: OntorumDB):
        self.db = db

    def compute(self) -> GraphStats:
        with self.db.get_session() as session:
            total_nodes = session.run("MATCH (n:Node) RETURN count(n) as c").single()["c"]
            total_relationships = session.run("MATCH ()-[r]->() RETURN count(r) as c").single()["c"]

            node_type_records = session.run(
                "MATCH (n:Node) RETURN n.type as type, count(n) as c"
            )
            node_type_distribution = {rec["type"]: rec["c"] for rec in node_type_records}

            rel_type_records = session.run(
                "MATCH ()-[r]->() RETURN type(r) as type, count(r) as c"
            )
            relationship_type_distribution = {rec["type"]: rec["c"] for rec in rel_type_records}

            avg_degree_record = session.run(
                "MATCH (n:Node) RETURN avg(size((n)--())) as avg_deg"
            ).single()
            avg_degree = float(avg_degree_record["avg_deg"] or 0.0)

        return GraphStats(
            total_nodes=total_nodes,
            total_relationships=total_relationships,
            average_degree=avg_degree,
            node_type_distribution=node_type_distribution,
            relationship_type_distribution=relationship_type_distribution,
        )
