"""
Statistical Analyzer Module

This module provides functionality for analyzing candidate embeddings and generating statistical insights.
Dependencies: numpy, pydantic, sklearn
"""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from pydantic import BaseModel, Field
from sklearn.cluster import KMeans
from sklearn.manifold import TSNE

class AnalysisConfig(BaseModel):
    analysis_type: str = Field(
        description="Type of analysis to perform",
        default="initial_entities"
    )
    max_candidates: Optional[int] = Field(
        description="Maximum number of candidates to select",
        default=6
    )
    min_distance: float = Field(
        description="Minimum semantic distance required between candidates",
        default=0.3
    )
    requires_mutual_exclusivity: bool = Field(
        description="Whether candidates must be mutually exclusive",
        default=False
    )
    visualization_level: str = Field(
        description="Level of visualization detail",
        default="detailed"
    )
    num_clusters: int = Field(
        description="Number of clusters for K-means clustering",
        default=3
    )

class EmbeddingVisualization(BaseModel):
    x: List[float]
    y: List[float]
    labels: List[str]
    cluster_assignments: List[int]

class DistributionStats(BaseModel):
    min: float
    max: float
    mean: float
    median: float
    std: float
    q1: float
    q3: float
    histogram_data: Dict[str, List[float]]  # bins and frequencies

class AnalysisResult(BaseModel):
    distances: Dict[str, float]
    sorted_nodes: List[Tuple[Dict[str, Any], float]]
    statistics: DistributionStats
    selected_indices: List[int]
    visualizations: Dict[str, str]  # ASCII visualizations
    embedding_viz: EmbeddingVisualization  # 2D embedding visualization data

class StatisticalAnalyzer:
    def __init__(self):
        self.distances = {}
    
    def analyze_candidates(
        self,
        candidates: List[Any],
        config: Optional[AnalysisConfig] = None
    ) -> AnalysisResult:
        if config is None:
            config = AnalysisConfig()
            
        # Calculate distances
        self.distances = self._calculate_distances(candidates)
        sorted_nodes = [(candidate, self.distances[candidate.name]) for candidate in candidates]
        sorted_nodes.sort(key=lambda x: x[1])
        
        # Calculate statistics
        stats = self._calculate_statistics(self.distances)
        
        # Generate visualizations
        visualizations = {}
        if config.visualization_level == "detailed":
            visualizations.update(self._generate_detailed_visualizations(self.distances))
        elif config.visualization_level == "basic":
            visualizations.update(self._generate_basic_visualizations(self.distances))
        
        # Generate 2D embeddings and clustering
        embedding_viz = self._generate_embedding_visualization(candidates, config.num_clusters)
        
        # Select candidates
        selected_indices = self._select_candidates(
            sorted_nodes,
            stats,
            config
        )
        
        # Convert sorted_nodes to serializable format
        sorted_nodes_dicts = [(
            {
                "name": node.name,
                "type": node.type,
                "description": node.description
            },
            distance
        ) for node, distance in sorted_nodes]
        
        return AnalysisResult(
            distances=self.distances,
            sorted_nodes=sorted_nodes_dicts,
            statistics=stats,
            selected_indices=selected_indices,
            visualizations=visualizations,
            embedding_viz=embedding_viz
        )

    def _calculate_distances(self, candidates: List[Any]) -> Dict[str, float]:
        if not candidates:
            return {}
        embeddings = np.array([candidate.embedding for candidate in candidates])
        if len(candidates) == 1:
            # Distance to self is not meaningful; return zero
            return {candidates[0].name: 0.0}

        norms = np.linalg.norm(embeddings, axis=1)
        similarity_matrix = np.dot(embeddings, embeddings.T) / np.outer(norms, norms)
        np.fill_diagonal(similarity_matrix, 0)
        distances = np.mean(1 - similarity_matrix, axis=1)
        return {candidates[i].name: float(d) for i, d in enumerate(distances)}

    def _calculate_statistics(self, distances: Dict[str, float]) -> DistributionStats:
        if not distances:
            return DistributionStats(
                min=0.0, max=0.0, mean=0.0, median=0.0,
                std=0.0, q1=0.0, q3=0.0,
                histogram_data={"bins": [], "frequencies": []}
            )
        
        values = np.array(list(distances.values()))
        hist, bins = np.histogram(values, bins='auto')
        
        return DistributionStats(
            min=float(np.min(values)),
            max=float(np.max(values)),
            mean=float(np.mean(values)),
            median=float(np.median(values)),
            std=float(np.std(values)),
            q1=float(np.percentile(values, 25)),
            q3=float(np.percentile(values, 75)),
            histogram_data={
                "bins": bins.tolist(),
                "frequencies": hist.tolist()
            }
        )

    def _generate_embedding_visualization(
        self,
        candidates: List[Any],
        num_clusters: int
    ) -> EmbeddingVisualization:
        if not candidates:
            return EmbeddingVisualization(x=[], y=[], labels=[], cluster_assignments=[])

        # Get embeddings
        embeddings = np.array([candidate.embedding for candidate in candidates])
        n_samples = len(candidates)

        if n_samples < 2:
            # t-SNE and clustering require at least two samples
            return EmbeddingVisualization(
                x=[0.0],
                y=[0.0],
                labels=[candidates[0].name],
                cluster_assignments=[0]
            )

        # Calculate appropriate perplexity (should be less than n_samples and >= 1)
        perplexity = min(30, max(1, n_samples - 1))

        # Reduce dimensionality to 2D with adjusted perplexity
        tsne = TSNE(n_components=2, random_state=42, perplexity=perplexity)
        embeddings_2d = tsne.fit_transform(embeddings)

        # Perform clustering
        kmeans = KMeans(n_clusters=min(num_clusters, n_samples), random_state=42)
        cluster_assignments = kmeans.fit_predict(embeddings)

        return EmbeddingVisualization(
            x=embeddings_2d[:, 0].tolist(),
            y=embeddings_2d[:, 1].tolist(),
            labels=[candidate.name for candidate in candidates],
            cluster_assignments=cluster_assignments.tolist()
        )

    def _generate_detailed_visualizations(
        self,
        distances: Dict[str, float]
    ) -> Dict[str, str]:
        if not distances:
            return {
                "histogram": "No data available for visualization",
                "boxplot": "No data available for visualization"
            }
        values = np.array(list(distances.values()))
        hist, bins = np.histogram(values, bins=10)
        max_bar = max(hist) if any(hist) else 1
        histogram = ["Distance Distribution Histogram:", "=" * 50]
        for count, bin_start in zip(hist, bins[:-1]):
            bar = "█" * int(20 * count / max_bar) if max_bar > 0 else ""
            histogram.append(f"{bin_start:.3f}: {bar} ({count})")
        histogram.append("=" * 50)
        
        stats = self._calculate_statistics(distances)
        boxplot = [
            "Distance Distribution Boxplot:",
            "=" * 50,
            f"Min: {stats.min:.3f}  Q1: {stats.q1:.3f}  Median: {stats.median:.3f}  Q3: {stats.q3:.3f}  Max: {stats.max:.3f}",
            "├──────┌████████████████████████┐──────────┤",
            "          │",
            "=" * 50,
            "Distances Stats:",
            f"min = {stats.min:.3f}, max = {stats.max:.3f}",
            f"mean = {stats.mean:.3f}, median = {stats.median:.3f}, stdev = {stats.std:.3f}",
            f"Q1 = {stats.q1:.3f}, Q3 = {stats.q3:.3f}"
        ]
        
        return {
            "histogram": "\n".join(histogram),
            "boxplot": "\n".join(boxplot)
        }
    
    def _generate_basic_visualizations(
        self,
        distances: Dict[str, float]
    ) -> Dict[str, str]:
        stats = self._calculate_statistics(distances)
        summary = [
            "Basic Statistics:",
            f"Range: {stats['min']:.3f} - {stats['max']:.3f}",
            f"Mean: {stats['mean']:.3f} ± {stats['std']:.3f}",
            f"Median: {stats['median']:.3f}"
        ]
        return {"summary": "\n".join(summary)}
    
    def _select_candidates(
        self,
        sorted_nodes: List[Tuple[Dict[str, Any], float]],
        stats: DistributionStats,
        config: AnalysisConfig
    ) -> List[int]:
        if not sorted_nodes:
            return []
        if config.analysis_type == "initial_entities":
            selected = []
            for i, (node, dist) in enumerate(sorted_nodes):
                if config.max_candidates is not None and len(selected) >= config.max_candidates:
                    break
                if not selected or dist - sorted_nodes[selected[-1]][1] >= config.min_distance:
                    selected.append(i)
            return selected
        elif config.analysis_type == "mutable_qualities":
            selected = []
            for i, (node, _) in enumerate(sorted_nodes):
                if node.name in self.distances and self.distances[node.name] <= stats.q3:
                    selected.append(i)
            if config.max_candidates is not None:
                selected = selected[:config.max_candidates]
            return selected
        elif config.analysis_type == "immutable_qualities":
            selected = []
            for i, (node, _) in enumerate(sorted_nodes):
                if node.name in self.distances and self.distances[node.name] <= stats.median:
                    selected.append(i)
            if config.max_candidates is not None:
                selected = selected[:config.max_candidates]
            return selected
        elif config.analysis_type == "properties":
            if config.requires_mutual_exclusivity:
                selected = []
                for i, (node, _) in enumerate(sorted_nodes):
                    if config.max_candidates is not None and len(selected) >= config.max_candidates:
                        break
                    if not selected or all(
                        abs(self.distances[node.name] - self.distances[sorted_nodes[j][0]["name"]]) >= config.min_distance
                        for j in selected
                    ):
                        selected.append(i)
                return selected
            else:
                selected = []
                for i, (node, _) in enumerate(sorted_nodes):
                    if node.name in self.distances and self.distances[node.name] <= stats.q3:
                        selected.append(i)
                if config.max_candidates is not None:
                    selected = selected[:config.max_candidates]
                return selected
        return [] 