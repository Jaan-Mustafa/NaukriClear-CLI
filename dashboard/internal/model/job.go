package model

// Job is a scanned job from NaukriClear CLI.
type Job struct {
	URL     string
	Company string
	Title   string
	Source  string // greenhouse, lever, ashby, smartrecruiters, workable, recruitee, cutshort, internshala
	Date    string // YYYY-MM-DD (scan date)
	Status  string // pending, applied, skip
}

// SourceAbbrev returns the short display label for a source.
func SourceAbbrev(source string) string {
	m := map[string]string{
		"greenhouse":      "GH",
		"lever":           "LVR",
		"ashby":           "ASHBY",
		"smartrecruiters": "SR",
		"workable":        "WRK",
		"recruitee":       "REC",
		"cutshort":        "CS",
		"internshala":     "IS",
	}
	if a, ok := m[source]; ok {
		return a
	}
	return "?"
}

// Metrics holds aggregate counts across all jobs.
type Metrics struct {
	Total    int
	Pending  int
	Applied  int
	Skip     int
	BySource map[string]int
}

// ComputeMetrics calculates metrics from a slice of jobs.
func ComputeMetrics(jobs []Job) Metrics {
	m := Metrics{BySource: make(map[string]int)}
	for _, j := range jobs {
		m.Total++
		m.BySource[j.Source]++
		switch j.Status {
		case "applied":
			m.Applied++
		case "skip":
			m.Skip++
		default:
			m.Pending++
		}
	}
	return m
}
